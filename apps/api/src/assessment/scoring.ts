import type { CefrBand } from "@zabankadeh/contracts";

export type ScoredQuestion = {
  skill: string;
  points: number;
  correctOptions: string[];
};

export type SubmittedAnswer = { questionId: string; optionIds: string[] };

export function scoreAssessment(
  questions: Array<ScoredQuestion & { id: string }>,
  answers: SubmittedAnswer[],
) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, [...answer.optionIds].sort()]));
  const skills = new Map<string, { earned: number; possible: number }>();
  let earned = 0;
  let possible = 0;

  for (const question of questions) {
    const selected = answerMap.get(question.id) ?? [];
    const expected = [...question.correctOptions].sort();
    const correct = selected.length === expected.length && selected.every((value, i) => value === expected[i]);
    possible += question.points;
    if (correct) earned += question.points;
    const skill = skills.get(question.skill) ?? { earned: 0, possible: 0 };
    skill.possible += question.points;
    if (correct) skill.earned += question.points;
    skills.set(question.skill, skill);
  }

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  const band: CefrBand =
    score >= 88 ? "c1" : score >= 74 ? "b2" : score >= 58 ? "b1" : score >= 42 ? "a2" : score >= 25 ? "a1" : "pre-a1";
  return {
    score,
    recommendedBand: band,
    skillScores: Object.fromEntries(
      [...skills].map(([skill, value]) => [skill, Math.round((value.earned / value.possible) * 100)]),
    ),
  };
}
