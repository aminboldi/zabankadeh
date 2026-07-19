import { describe, expect, it } from "vitest";
import { scoreAssessment } from "../src/assessment/scoring";

const questions = [
  { id: "1", skill: "grammar", points: 1, correctOptions: ["a"] },
  { id: "2", skill: "reading", points: 1, correctOptions: ["b"] },
  { id: "3", skill: "vocabulary", points: 2, correctOptions: ["c", "d"] },
];

describe("scoreAssessment", () => {
  it("requires an exact option match and calculates skill scores", () => {
    const result = scoreAssessment(questions, [
      { questionId: "1", optionIds: ["a"] },
      { questionId: "2", optionIds: ["wrong"] },
      { questionId: "3", optionIds: ["d", "c"] },
    ]);
    expect(result.score).toBe(75);
    expect(result.recommendedBand).toBe("b2");
    expect(result.skillScores).toEqual({ grammar: 100, reading: 0, vocabulary: 100 });
  });

  it("does not award unanswered questions", () => {
    expect(scoreAssessment(questions, []).score).toBe(0);
  });
});
