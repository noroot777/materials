// 演示仓库里的「代码」：任务分支上真有提交，界面上的改动统计、提交列表、diff 才不是空的。
// 入镜的那一个任务（结算页接入 Apple Pay）手写，其余按路径生成一份像样的占位。
import { basename } from "node:path";

const camel = (path) => basename(path).replace(/\.[a-z]+$/, "").replace(/[-_.](\w)/g, (_, c) => c.toUpperCase());

/** 按路径生成一个模块：内容稳定，同一路径每次都一样。 */
export function scaffold(path, blocks = 5) {
  const name = camel(path);
  const out = [`// ${path}`, `import { invariant } from "@lumen/std";`, ""];
  for (let i = 1; i <= blocks; i += 1) {
    out.push(
      `export function ${name}Step${i}(input: StepInput): StepOutput {`,
      `  invariant(input != null, "${name}: 缺少输入");`,
      `  const next = { ...input, revision: input.revision + ${i} };`,
      `  return finalize(next, { stage: ${i} });`,
      `}`,
      "",
    );
  }
  return out.join("\n");
}

/** 在已有内容上「改一轮」：换掉几行、末尾再添一段，diff 里增删都有。 */
export function revise(content, round = 1) {
  const lines = content.split("\n").map((line, index) => {
    if (line.includes("const next =") && index % 2 === round % 2) {
      return line.replace("const next =", "const next: StepState =").replace("};", `, round: ${round} };`);
    }
    if (line.includes("finalize(next,")) return line.replace("finalize(next,", `finalize(withTrace(next, ${round}),`);
    return line;
  });
  lines.push(
    `export function round${round}Guard(state: StepState): boolean {`,
    `  if (state.revision < ${round}) return false;`,
    `  return state.round === undefined || state.round <= ${round};`,
    `}`,
    "",
  );
  return lines.join("\n");
}

const CHECKOUT_BASE = `import { useState } from "react";
import { CardProvider } from "../payments/card";
import type { Order } from "../orders/types";
import { OrderSummary } from "./OrderSummary";

const card = new CardProvider();

export function CheckoutPage({ order }: { order: Order }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPaying(true);
    const result = await card.pay(order);
    setPaying(false);
    if (result.status === "failed") setError(result.reason);
  }

  return (
    <main className="checkout">
      <OrderSummary order={order} />
      <button className="checkout__pay" disabled={paying} onClick={submit}>
        刷卡支付
      </button>
      {error && <p className="checkout__error">{error}</p>}
    </main>
  );
}
`;

const CHECKOUT_NEXT = `import { useEffect, useState } from "react";
import { providers } from "../payments";
import type { PaymentProvider } from "../payments/provider";
import type { Order } from "../orders/types";
import { OrderSummary } from "./OrderSummary";

export function CheckoutPage({ order }: { order: Order }) {
  const [usable, setUsable] = useState<PaymentProvider[]>([]);
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all(providers.map(async (p) => ((await p.canUse()) ? p : null))).then((list) => {
      if (alive) setUsable(list.filter((p): p is PaymentProvider => p !== null));
    });
    return () => { alive = false; };
  }, []);

  async function submit(provider: PaymentProvider) {
    setPaying(provider.id);
    setError(null);
    const result = await provider.pay(order);
    setPaying(null);
    if (result.status === "failed") setError(result.reason);
  }

  return (
    <main className="checkout">
      <OrderSummary order={order} />
      {usable.map((provider) => (
        <button
          key={provider.id}
          className={\`checkout__pay checkout__pay--\${provider.id}\`}
          disabled={paying !== null}
          onClick={() => submit(provider)}
        >
          {provider.label}
        </button>
      ))}
      {error && <p className="checkout__error">{error}</p>}
    </main>
  );
}
`;

const PROVIDER = `import type { Order } from "../orders/types";

export type PaymentResult =
  | { status: "paid"; transactionId: string }
  | { status: "cancelled" }
  | { status: "failed"; reason: string };

export interface PaymentProvider {
  readonly id: string;
  readonly label: string;
  /** 当前环境能不能用这种支付方式。 */
  canUse(): boolean | Promise<boolean>;
  pay(order: Order): Promise<PaymentResult>;
}
`;

const INDEX_BASE = `import { CardProvider } from "./card";
import type { PaymentProvider } from "./provider";

export const providers: PaymentProvider[] = [new CardProvider()];
`;

const INDEX_NEXT = `import { ApplePayProvider } from "./apple-pay";
import { CardProvider } from "./card";
import type { PaymentProvider } from "./provider";

// 顺序即结算页上的展示顺序：能用 Apple Pay 的设备上它排第一。
export const providers: PaymentProvider[] = [new ApplePayProvider(), new CardProvider()];
`;

const APPLE_PAY = `import type { Order } from "../orders/types";
import type { PaymentProvider, PaymentResult } from "./provider";

const VERSION = 14;

export class ApplePayProvider implements PaymentProvider {
  readonly id = "apple-pay";
  readonly label = " Pay";

  /** 只在 Safari / iOS 且钱包里有卡时出现；其余浏览器没有 ApplePaySession。 */
  async canUse(): Promise<boolean> {
    const session = window.ApplePaySession;
    if (!session?.supportsVersion(VERSION)) return false;
    return session.canMakePayments();
  }

  pay(order: Order): Promise<PaymentResult> {
    return new Promise((resolve) => {
      const session = new ApplePaySession(VERSION, {
        countryCode: "CN",
        currencyCode: order.currency,
        supportedNetworks: ["visa", "masterCard", "chinaUnionPay"],
        merchantCapabilities: ["supports3DS"],
        total: { label: "Lumen", amount: order.total.toFixed(2) },
      });

      session.onvalidatemerchant = async ({ validationURL }) => {
        const res = await fetch("/api/pay/apple/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ validationURL }),
        });
        if (!res.ok) return session.abort();
        session.completeMerchantValidation(await res.json());
      };

      session.onpaymentauthorized = async ({ payment }) => {
        const res = await fetch(\`/api/orders/\${order.id}/pay\`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider: this.id, token: payment.token }),
        });
        if (!res.ok) {
          session.completePayment(ApplePaySession.STATUS_FAILURE);
          return resolve({ status: "failed", reason: "支付未完成，请换一种方式重试" });
        }
        const { transactionId } = await res.json();
        session.completePayment(ApplePaySession.STATUS_SUCCESS);
        resolve({ status: "paid", transactionId });
      };

      session.oncancel = () => resolve({ status: "cancelled" });
      session.begin();
    });
  }
}
`;

const APPLE_VALIDATE = `import { Router } from "express";
import { readFileSync } from "node:fs";
import { Agent } from "undici";

const ALLOWED_HOST = /^apple-pay-gateway(-[a-z0-9-]+)?\\.apple\\.com$/;

// 商户号与证书路径只走环境变量，不进仓库。
const merchantId = process.env.APPLE_PAY_MERCHANT_ID!;
const dispatcher = new Agent({
  connect: {
    cert: readFileSync(process.env.APPLE_PAY_CERT_PATH!),
    key: readFileSync(process.env.APPLE_PAY_KEY_PATH!),
  },
});

export const applePayValidate = Router().post("/api/pay/apple/validate", async (req, res) => {
  const url = new URL(String(req.body.validationURL));
  // validationURL 来自浏览器，不校验域名就等于替任何人带着商户证书发请求。
  if (url.protocol !== "https:" || !ALLOWED_HOST.test(url.hostname)) return res.status(400).end();

  const upstream = await fetch(url, {
    method: "POST",
    dispatcher,
    body: JSON.stringify({
      merchantIdentifier: merchantId,
      displayName: "Lumen",
      initiative: "web",
      initiativeContext: req.hostname,
    }),
  });
  res.status(upstream.status).json(await upstream.json());
});
`;

/** 各仓库的起点内容（main 上的第一次提交）。 */
export const BASE_FILES = {
  web: {
    "README.md": "# lumen-web\n\nLumen 的官网与控制台。\n",
    "src/payments/provider.ts": PROVIDER,
    "src/payments/index.ts": INDEX_BASE,
    "src/payments/card.ts": scaffold("src/payments/card.ts", 3),
    "src/checkout/CheckoutPage.tsx": CHECKOUT_BASE,
  },
  api: { "README.md": "# lumen-api\n\nLumen 的后端服务。\n", "src/server.ts": "export const port = 8080;\n" },
  mobile: { "README.md": "# lumen-mobile\n\nLumen 的移动端。\n", "app/index.tsx": "export default function Home() { return null; }\n" },
};

/** 手写的提交序列，按任务 key 取；没有的任务由 seed 按它碰过的路径生成。 */
export const COMMITS = {
  applepay: [
    {
      message: "feat(payments): 新增 ApplePayProvider",
      files: { "src/payments/apple-pay.ts": APPLE_PAY, "src/payments/index.ts": INDEX_NEXT },
    },
    { message: "feat(checkout): 结算页按 canUse() 列出可用的支付方式", files: { "src/checkout/CheckoutPage.tsx": CHECKOUT_NEXT } },
    { message: "feat(server): Apple Pay 商户校验路由", files: { "src/server/routes/apple-pay-validate.ts": APPLE_VALIDATE } },
  ],
};
