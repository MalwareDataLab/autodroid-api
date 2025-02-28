type EmailNotificationTemplate = "generic" | "processingResult";

type IEmailNotificationProviderCommonVariables = {
  subject: string;
  preheader: string;
  title: string;
  message: string[];

  button_text?: string;
  button_url?: string;

  footer_text: string[];

  language: string;
};

type IEmailNotificationTemplateDTO = {
  generic: IEmailNotificationProviderCommonVariables;

  processingResult: {
    processing_id: string;
    processing_seq: bigint;
    button_url: string;
  };
};

type Template = {
  [K in EmailNotificationTemplate]: {
    type: K;
    variables: K extends keyof IEmailNotificationTemplateDTO
      ? IEmailNotificationTemplateDTO[K]
      : never;
  };
}[EmailNotificationTemplate];

type IEmailRecipientDTO = {
  name?: string | null;
  email: string;
};

type ISendEmailNotificationDTO = {
  to: IEmailRecipientDTO[];
  cc?: IEmailRecipientDTO[];
  bcc?: IEmailRecipientDTO[];

  subject: string;

  template: Template;
};

export { ISendEmailNotificationDTO, IEmailRecipientDTO };
