import Mailgen from "mailgen";
import path from "path";

const brandName = process.env.BREVO_SENDER_NAME?.trim() || "Your Business";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

export const mailGenerator = new Mailgen({
  theme: {
    path: path.resolve(process.cwd(), "node_modules/mailgen/themes/default/index.html"),

    plaintextPath: path.resolve(process.cwd(), "node_modules/mailgen/themes/default/index.txt"),
  },

  product: {
    name: brandName,

    link: appUrl,
  },
});