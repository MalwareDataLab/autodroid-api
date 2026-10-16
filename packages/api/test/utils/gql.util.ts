import graphqlTag from "graphql-tag";
import { print } from "graphql/language/printer";

export const gql = (strings: TemplateStringsArray, ...values: any[]) =>
  print(graphqlTag(strings, ...values));
