import Mailgen from "mailgen";
import path from "path";

export const mailGenerator = new Mailgen({
  theme: {
    path: path.resolve(
      process.cwd(),
      "node_modules/mailgen/themes/default/index.html"
    ),

    plaintextPath: path.resolve(
      process.cwd(),
      "node_modules/mailgen/themes/default/index.txt"
    ),
  },

  product: {
    name: "LeadFlowAI",

    link:
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
  },
});