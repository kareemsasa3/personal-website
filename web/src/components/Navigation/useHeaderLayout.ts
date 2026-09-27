import { useMediaQuery } from "../../hooks/useMediaQuery";

export type HeaderLayout = "wide" | "mid" | "phone";

const WIDE_QUERY = "(min-width: 1181px)";
const PHONE_QUERY = "(max-width: 640px)";

export const useHeaderLayout = (): HeaderLayout => {
  const isWide = useMediaQuery(WIDE_QUERY);
  const isPhone = useMediaQuery(PHONE_QUERY);
  if (isWide) return "wide";
  return isPhone ? "phone" : "mid";
};
