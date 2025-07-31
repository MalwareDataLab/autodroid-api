import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Type import
import { ParsedSamlUser } from "@shared/infrastructure/saml/types";

interface IRequest {
  user: ParsedSamlUser;
  language: string;
}

interface IResponse {
  customToken: string;
  firebaseUid: string;
}

@injectable()
class HandleSamlToFirebaseAuthenticationService {
  constructor(
    @inject("AuthenticationProvider")
    private authenticationProvider: IAuthenticationProvider,
  ) {}

  public async execute({ user, language }: IRequest): Promise<IResponse> {
    const t = await i18n(language);

    try {
      if (!user.email) {
        throw new AppError({
          key: "@handle_saml_to_firebase_authentication_service/EMAIL_REQUIRED",
          message: t(
            "@handle_saml_to_firebase_authentication_service/EMAIL_REQUIRED",
            "User email is required for Firebase authentication.",
          ),
        });
      }

      const firebaseProvider = await this.authenticationProvider.getProvider(
        AUTH_PROVIDER.FIREBASE,
      );

      const customClaims = {
        saml_authenticated: true,
        saml_uid: user.uid,
        saml_email: user.email,
        saml_username: user.username,
        saml_firstName: user.firstName,
        saml_lastName: user.lastName,
        saml_nameID: user.nameID,
        provider: "saml",
        last_saml_login: new Date().toISOString(),
      };

      const firebaseUid = user.email;

      if (!firebaseUid) {
        throw new AppError({
          key: "@handle_saml_to_firebase_authentication_service/INVALID_UID",
          message: t(
            "@handle_saml_to_firebase_authentication_service/INVALID_UID",
            "No valid UID found for Firebase custom token.",
          ),
        });
      }

      let firebaseUser;
      try {
        firebaseUser = await firebaseProvider.getUserByEmail(
          user.email,
          language,
        );
      } catch (error: any) {
        firebaseUser = await firebaseProvider.createUser(
          {
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            email: user.email,
            email_verified: true,
          },
          language,
        );
      }

      const customToken = await firebaseProvider.createUserTokenByCode({
        code: firebaseUser.code,
        payload: customClaims,
        language,
      });

      return {
        customToken,
        firebaseUid: firebaseUser.code,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError({
        key: "@handle_saml_to_firebase_authentication_service/FAILED_TO_CREATE_TOKEN",
        message: t(
          "@handle_saml_to_firebase_authentication_service/FAILED_TO_CREATE_TOKEN",
          "Failed to create authentication token.",
        ),
        statusCode: 500,
        debug: {
          user,
          error,
        },
      });
    }
  }
}

export { HandleSamlToFirebaseAuthenticationService };
