const faqs = [
  {
    question: "What happens when a new lead contacts my business?",
    answer:
      "The lead can enter an AI-assisted conversation that captures relevant service and qualification details. The lead and conversation are then available from your dashboard.",
  },
  {
    question: "Can leads contact us outside business hours?",
    answer:
      "Yes. The lead experience can remain available around the clock, allowing prospects to provide information even when your team is not currently available.",
  },
  {
    question: "Can I customize how the AI talks to customers?",
    answer:
      "Yes. You can configure business information, services, service areas, tone, qualification fields, welcome messaging and additional AI instructions.",
  },
  {
    question: "Do I have to replace my existing website?",
    answer:
      "No. The product includes a public lead experience and an embeddable widget so the lead workflow can be connected to an existing website.",
  },
  {
    question: "Can prospects book appointments?",
    answer:
      "Yes. Your business can configure availability and qualified prospects can choose from available appointment times.",
  },
  {
    question: "What is included with Pro?",
    answer:
      "Pro provides higher monthly usage limits and includes features such as automated follow-ups and Google Calendar integration.",
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      className="border-t border-white/[0.07] bg-black py-24 sm:py-32"
    >
      <div className="mx-auto max-w-4xl px-5 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            FAQ
          </p>

          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Questions before you start?
          </h2>
        </div>

        <div className="mt-14 border-t border-white/[0.08]">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group border-b border-white/[0.08]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-6 text-left">
                <span className="text-base font-medium text-zinc-200 sm:text-lg">
                  {faq.question}
                </span>

                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-lg text-zinc-500 transition duration-300 group-open:rotate-45 group-open:bg-white group-open:text-black">
                  +
                </span>
              </summary>

              <div className="faq-content">
                <p className="max-w-3xl pb-7 pr-10 text-sm leading-7 text-zinc-500 sm:text-base">
                  {faq.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
