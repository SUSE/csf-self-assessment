// What a Rulebook card IS, and nothing about who reads it.
//
// The help system is one mechanism serving three audiences — the author writing
// the instrument, the participant answering it, and the facilitator running the
// room — so the CARD SHAPE lives here and each audience's cards live in their own
// module (author-rules, participant-rules, facilitator-rules). An app hands one
// set to `createHelp`; every gating decision downstream (which header icon stays
// pressable, whether a `RuleCite` renders at all) follows from what that set
// holds, so a set that says nothing about a control silently and correctly
// disables it.

export type RuleSection = {
  /** Card key cited by a control's `data-rule`, a header icon's `rule`, or a
   *  finding's `RuleCite`. */
  id: string;
  /** Display tag, e.g. '§ 3.3'. */
  tag: string;
  /** The concern this card explains, e.g. 'Grain'. */
  eyebrow: string;
  /** One-line thesis. */
  title: string;
  /** Body paragraphs, plain text. */
  paras: string[];
  /** The named failure mode this rule guards against, if any. */
  watch?: string;
};
