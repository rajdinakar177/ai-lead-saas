const faqs = [
  {
    question: "What happens when I get a new lead?",
    answer:
      "The lead is captured, stored, and can immediately receive an automated response. The AI can then qualify the lead and guide them toward booking an appointment.",
  },
  {
    question: "Can the AI work outside business hours?",
    answer:
      "Yes. The system is designed to respond 24/7, so potential customers don't have to wait until your business opens.",
  },
  {
    question: "Can I customize the AI?",
    answer:
      "Yes. Your business information, services, qualification questions and conversation behavior can be customized.",
  },
  {
    question: "Do I need to replace my existing website?",
    answer:
      "Not necessarily. The lead capture and automation system can be integrated into an existing website.",
  },
];

export function FAQ() {
  return (
    <section className="border-t border-white/10 py-24">
      <div className="mx-auto max-w-4xl px-5 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            FAQ
          </p>

          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">
            Questions, answered.
          </h2>
        </div>

        <div className="mt-12 divide-y divide-white/10 rounded-3xl border border-white/10">
          {faqs.map((faq) => (
            <details key={faq.question} className="group p-6">
              <summary className="cursor-pointer list-none font-medium text-white">
                <div className="flex items-center justify-between">
                  {faq.question}
                  <span className="ml-4 text-zinc-500 transition group-open:rotate-45">
                    +
                  </span>
                </div>
              </summary>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}