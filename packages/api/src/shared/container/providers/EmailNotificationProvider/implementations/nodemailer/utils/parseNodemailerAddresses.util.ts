// Type import
import { IEmailRecipientDTO } from "../../../types/IEmailNotification.dto";

const parseNodemailerAddresses = (recipients?: IEmailRecipientDTO[]) =>
  recipients?.map(({ email, name }) =>
    name
      ? {
          name,
          address: email,
        }
      : email,
  );

export { parseNodemailerAddresses };
