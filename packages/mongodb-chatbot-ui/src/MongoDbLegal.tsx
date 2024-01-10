import { useLinkData } from "./useLinkData";
import { addQueryParams } from "./utils";
import { Body, Link } from "@leafygreen-ui/typography";

export function MongoDbLegalDisclosure() {
  const { tck } = useLinkData();
  const TermsOfUse = () => (
    <Link
      hideExternalIcon
      href={addQueryParams("https://www.mongodb.com/legal/terms-of-use", {
        tck,
      })}
    >
      Terms of Use
    </Link>
  );
  const AcceptableUsePolicy = () => (
    <Link
      hideExternalIcon
      href={addQueryParams(
        "https://www.mongodb.com/legal/acceptable-use-policy",
        { tck }
      )}
    >
      Acceptable Use Policy
    </Link>
  );

  return (
    <Body>
      This is a generative AI chatbot. By interacting with it, you agree to
      MongoDB's <TermsOfUse /> and <AcceptableUsePolicy />.
    </Body>
  );
}

export const MongoDbVerifyInformationMessage = "This is an experimental generative AI chatbot. All information should be verified prior to use."
