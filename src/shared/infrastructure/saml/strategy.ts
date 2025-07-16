import { MultiSamlStrategy } from "@node-saml/passport-saml";
import passport from "passport";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import xpath from "xpath";
import schedule from "node-schedule";
import { MetadataReader, toPassportConfig } from "passport-saml-metadata";
import { XMLBuilder } from "fast-xml-parser";
import { container } from "tsyringe";

// Util import
import { logger } from "@shared/utils/logger";

// Service import
import { HandleSamlToFirebaseAuthenticationService } from "@modules/authentication/services/handleSamlToFirebaseAuthentication.service";

// Type import
import { AuthenticatedRequest, ParsedSamlUser } from "./types";

interface IdPConfig {
  entryPoint: string;
  logoutUrl?: string;
  idpCert: string | string[];
  issuer: string;
  callbackUrl: string;
  identifierFormat: string;
  wantAssertionsSigned: boolean;
  authnRequestBinding: string;
  signRequest: boolean;
  cert: string;
  privateKey: string;
  decryptionPvk: string;
}

class SamlFederationManager {
  public readonly initialization: Promise<void>;

  private idpIndex: Record<string, IdPConfig> = {};
  private refreshInterval: string = "0 */6 * * *"; // Every 6 hours

  private readonly SP_CERT = process.env.SAML_PUBLIC_KEY?.replace(/\\n/g, "\n");
  private readonly SP_KEY = process.env.SAML_PRIVATE_KEY?.replace(/\\n/g, "\n");
  private readonly FEDERATION_URL =
    "https://ds.cafeexpresso.rnp.br/metadata/ds-metadata.xml";
  public readonly DISCOVERY_SERVICE_URL =
    "https://ds.cafeexpresso.rnp.br/WAYF.php";
  private readonly APP_URL = process.env.APP_URL || "http://localhost:3000";
  public readonly BASE_URL = this.APP_URL;
  public readonly BASE_SAML_PATH = "/rnp-cafe-saml";
  public readonly SAML_ISSUER = `${this.BASE_URL}${this.BASE_SAML_PATH}/metadata`;

  public readonly LOCAL_DISCOVERY_RESPONSE_URL = `${this.BASE_URL}${this.BASE_SAML_PATH}/discovery`;

  private readonly SAML_ATTRIBUTE_MAP: Record<string, string> = {
    "urn:oid:0.9.2342.19200300.100.1.1": "uid",
    "urn:oid:0.9.2342.19200300.100.1.3": "mail",
    "urn:oid:2.5.4.42": "givenName",
    "urn:oid:2.5.4.4": "sn",
    "urn:oid:1.3.6.1.4.1.5923.1.1.1.6": "eduPersonPrincipalName",
  };

  constructor() {
    this.initialization = this.initialize();
    this.configurePassport();
  }

  private async initialize(): Promise<void> {
    await this.refreshMetadata();
    this.scheduleRefresh();
  }

  private scheduleRefresh(): void {
    schedule.scheduleJob(this.refreshInterval, () => {
      this.refreshMetadata().catch(err => {
        logger.error("❌ Scheduled metadata refresh failed:", err);
      });
    });
  }

  async refreshMetadata(): Promise<void> {
    try {
      if (!this.SP_CERT || !this.SP_KEY) {
        throw new Error("SAML certificates not configured.");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(this.FEDERATION_URL, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const xml = await resp.text();

      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const select = xpath.useNamespaces({
        md: "urn:oasis:names:tc:SAML:2.0:metadata",
        ds: "http://www.w3.org/2000/09/xmldsig#",
      });

      const nodes = select(
        "//md:EntityDescriptor[md:IDPSSODescriptor]",
        doc as any,
      );

      if (!nodes || !Array.isArray(nodes)) {
        throw new Error("No IdP entities found in metadata");
      }

      const idpEntries = nodes
        .map((node: any) => {
          const idpXml = new XMLSerializer().serializeToString(node);
          const reader = new MetadataReader(idpXml);
          const cfg = toPassportConfig(reader, { multipleCerts: true });

          let certs: string[] = []
            .concat(
              cfg.idpCert || [],
              (cfg as any).cert || [],
              (cfg as any).certs || [],
              (cfg as any).certificate || [],
              (cfg as any).certificates || [],
            )
            .filter(Boolean);

          if (certs.length === 0) {
            const certNodes = select(".//ds:X509Certificate", node);
            if (certNodes && Array.isArray(certNodes)) {
              certs = certNodes
                .map((certNode: any) => certNode.textContent)
                .filter(Boolean);
            }
          }

          const normalizedCerts = certs.map((c: any) =>
            typeof c === "string" ? c.replace(/\s+/g, "") : c,
          );

          if (normalizedCerts.length === 0) return undefined;

          return [
            reader.entityId,
            {
              entryPoint: cfg.entryPoint,
              logoutUrl: cfg.logoutUrl,
              idpCert:
                normalizedCerts.length === 1
                  ? normalizedCerts[0]
                  : normalizedCerts,
              issuer: this.SAML_ISSUER,
              callbackUrl: `${this.BASE_URL}/rnp-cafe-saml/callback`,
              identifierFormat:
                "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
              wantAssertionsSigned: true,
              authnRequestBinding: "HTTP-Redirect",
              signRequest: true,
              cert: this.SP_CERT,
              privateKey: this.SP_KEY,
              decryptionPvk: this.SP_KEY,
            } as IdPConfig,
          ] as [string, IdPConfig];
        })
        .filter(
          (entry): entry is [string, IdPConfig] =>
            Array.isArray(entry) && entry.length === 2,
        );

      this.idpIndex = Object.fromEntries(idpEntries);

      logger.info(
        `✅ Loaded ${Object.keys(this.idpIndex).length} IdPs from federation metadata`,
      );
    } catch (error: any) {
      logger.error(
        `❌ Error processing SAML metadata. SAML requests will fail. ${error?.message}`,
      );
    }
  }

  getConfig(entityID: string): IdPConfig {
    const config = this.idpIndex[entityID];
    if (!config) throw new Error(`IdP ${entityID} not found in metadata`);
    return config;
  }

  listIdps(): string[] {
    return Object.keys(this.idpIndex);
  }

  getIdpIndex(): Record<string, IdPConfig> {
    return { ...this.idpIndex };
  }

  generateMetadata(): string {
    if (!this.SP_CERT || !this.SP_KEY) {
      throw new Error("SAML certificates not configured");
    }

    const formattedCert = this.SP_CERT.replace(
      /-----(BEGIN|END) CERTIFICATE-----/g,
      "",
    )
      .replace(/\s/g, "")
      .replace(/(.{64})/g, "$1\n");

    const baseUrl = this.BASE_URL;

    const metadata = {
      "?xml": { "@_version": "1.0" },
      "md:EntityDescriptor": {
        "@_xmlns:md": "urn:oasis:names:tc:SAML:2.0:metadata",
        "@_xmlns:saml2": "urn:oasis:names:tc:SAML:2.0:assertion",
        "@_xmlns:mdui": "urn:oasis:names:tc:SAML:metadata:ui",
        "@_xmlns:ds": "http://www.w3.org/2000/09/xmldsig#",
        "@_entityID": this.SAML_ISSUER,
        "@_ID": this.SAML_ISSUER.replace(/[^\w]/g, "_"),
        "@_cacheDuration": "PT1H",
        "md:SPSSODescriptor": {
          "@_AuthnRequestsSigned": true,
          "@_WantAssertionsSigned": true,
          "@_protocolSupportEnumeration":
            "urn:oasis:names:tc:SAML:2.0:protocol",
          "md:Extensions": {
            "mdui:UIInfo": {
              "@_xmlns:mdui": "urn:oasis:names:tc:SAML:metadata:ui",
              "mdui:DisplayName": {
                "@_xml:lang": "en",
                "#text": "Malware DataLab",
              },
              "mdui:Description": {
                "@_xml:lang": "en",
                "#text": "Malware analysis and research platform",
              },
              "mdui:InformationURL": {
                "@_xml:lang": "en",
                "#text": "https://malwaredatalab.github.io/",
              },
              "mdui:PrivacyStatementURL": {
                "@_xml:lang": "en",
                "#text": "https://malwaredatalab.github.io/privacy",
              },
            },
            DiscoveryResponse: {
              "@_xmlns":
                "urn:oasis:names:tc:SAML:profiles:SSO:idp-discovery-protocol",
              "@_Binding":
                "urn:oasis:names:tc:SAML:profiles:SSO:idp-discovery-protocol",
              "@_Location": this.LOCAL_DISCOVERY_RESPONSE_URL,
              "@_isDefault": true,
              "@_index": "0",
            },
          },
          "md:KeyDescriptor": [
            {
              "@_use": "signing",
              "ds:KeyInfo": {
                "ds:X509Data": {
                  "ds:X509Certificate": formattedCert,
                },
              },
            },
            {
              "@_use": "encryption",
              "ds:KeyInfo": {
                "ds:X509Data": {
                  "ds:X509Certificate": formattedCert,
                },
              },
              "md:EncryptionMethod": [
                { "@_Algorithm": "http://www.w3.org/2009/xmlenc11#aes256-gcm" },
                { "@_Algorithm": "http://www.w3.org/2009/xmlenc11#aes128-gcm" },
                {
                  "@_Algorithm": "http://www.w3.org/2001/04/xmlenc#aes256-cbc",
                },
                {
                  "@_Algorithm": "http://www.w3.org/2001/04/xmlenc#aes128-cbc",
                },
              ],
            },
          ],
          "md:SingleLogoutService": [
            {
              "@_Binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
              "@_Location": `${baseUrl}/rnp-cafe-saml/logout`,
            },
            {
              "@_Binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
              "@_Location": `${baseUrl}/rnp-cafe-saml/logout`,
            },
          ],
          "md:NameIDFormat":
            "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
          "md:AssertionConsumerService": [
            {
              "@_index": "0",
              "@_isDefault": true,
              "@_Binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
              "@_Location": `${baseUrl}/rnp-cafe-saml/callback`,
            },
            {
              "@_index": "1",
              "@_isDefault": false,
              "@_Binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact",
              "@_Location": `${baseUrl}/rnp-cafe-saml/callback`,
            },
          ],
        },
        "md:Organization": {
          "md:OrganizationName": {
            "@_xml:lang": "pt-BR",
            "#text": "Malware DataLab",
          },
          "md:OrganizationDisplayName": {
            "@_xml:lang": "pt-BR",
            "#text": "Malware DataLab",
          },
          "md:OrganizationURL": {
            "@_xml:lang": "pt-BR",
            "#text": "https://malwaredatalab.github.io/",
          },
        },
        "md:ContactPerson": {
          "@_contactType": "technical",
          "md:Company": "Malware DataLab",
          "md:EmailAddress": "malwaredatalab@gmail.com",
          "md:GivenName": "Luiz Felipe",
          "md:SurName": "Laviola",
        },
      },
    };

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      format: true,
      indentBy: "  ",
      suppressBooleanAttributes: false,
    });

    return builder.build(metadata);
  }

  configurePassport(): void {
    passport.use(
      new MultiSamlStrategy(
        {
          passReqToCallback: true,
          getSamlOptions: (
            req: AuthenticatedRequest,
            done: (err: any, config?: any) => void,
          ) => {
            try {
              let entityID = req.query.idp as string;

              if (!entityID) {
                if (req.body?.SAMLResponse) {
                  try {
                    const samlResponse = Buffer.from(
                      req.body.SAMLResponse,
                      "base64",
                    ).toString();
                    const doc = new DOMParser().parseFromString(
                      samlResponse,
                      "text/xml",
                    );
                    const select = xpath.useNamespaces({
                      saml2: "urn:oasis:names:tc:SAML:2.0:assertion",
                      samlp: "urn:oasis:names:tc:SAML:2.0:protocol",
                    });

                    const issuerNodes = select("//saml2:Issuer", doc as any);
                    if (
                      issuerNodes &&
                      Array.isArray(issuerNodes) &&
                      issuerNodes.length > 0
                    ) {
                      const issuerText = issuerNodes[0].textContent;
                      if (issuerText) {
                        entityID = issuerText;
                      }
                    }
                  } catch (parseError) {
                    logger.warn(
                      "Failed to parse SAML response for entityID:",
                      parseError,
                    );
                  }
                }
              }

              if (!entityID) {
                return done(new Error("IdP not supported"));
              }

              const config = this.getConfig(entityID);
              return done(null, config);
            } catch (err) {
              return done(err);
            }
          },
        },
        (
          req: AuthenticatedRequest,
          profile: any,
          done: (err: any, user?: any) => void,
        ) => {
          const parsedUser = this.parseUserProfile(profile);
          done(null, parsedUser);
        },
        (
          req: AuthenticatedRequest,
          profile: any,
          done: (err: any, user?: any) => void,
        ) => {
          done(null, { nameID: profile.nameID });
        },
      ),
    );

    // Disable session serialization since we're not using sessions
    passport.serializeUser((user: any, done: (err: any, id?: any) => void) =>
      done(null, null),
    );
    passport.deserializeUser((obj: any, done: (err: any, user?: any) => void) =>
      done(null, null),
    );
  }

  getPassport(): typeof passport {
    return passport;
  }

  parseUserProfile(rawClaims: Record<string, any>): ParsedSamlUser {
    const friendly: Record<string, any> = {};
    const rawClaimsCopy = { ...rawClaims };

    Object.keys(rawClaims).forEach(key => {
      if (this.SAML_ATTRIBUTE_MAP[key]) {
        friendly[this.SAML_ATTRIBUTE_MAP[key]] = rawClaims[key];
      }
    });

    return {
      uid: friendly.uid,
      email: friendly.mail,
      firstName: friendly.givenName,
      lastName: friendly.sn,
      username: friendly.eduPersonPrincipalName,
      nameID: rawClaims.nameID,
      rawClaims: rawClaimsCopy,
    };
  }

  getAttributeMap(): Record<string, string> {
    return { ...this.SAML_ATTRIBUTE_MAP };
  }

  async createFirebaseCustomToken(user: ParsedSamlUser): Promise<string> {
    try {
      const handleSamlToFirebaseAuthenticationService = container.resolve(
        HandleSamlToFirebaseAuthenticationService,
      );

      const result = await handleSamlToFirebaseAuthenticationService.execute({
        user,
        language: "en", // Default language, can be made configurable
      });

      return result.customToken;
    } catch (error) {
      logger.error("Error creating Firebase custom token:", error);
      throw error;
    }
  }

  async getFrontendRedirectUrl(user: ParsedSamlUser): Promise<string> {
    const customToken = await this.createFirebaseCustomToken(user);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Use URLSearchParams for safe URL construction
    const params = new URLSearchParams({
      customToken,
      provider: "saml",
      timestamp: Date.now().toString(),
    });

    return `${frontendUrl}/auth/callback?${params.toString()}`;
  }
}

const federationManager = new SamlFederationManager();

export { federationManager, SamlFederationManager };
