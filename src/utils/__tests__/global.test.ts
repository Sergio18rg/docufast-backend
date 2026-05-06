import {
  trim,
  trimOptional,
  toValidDate,
  getErrorMessage,
  getDocumentStatus,
} from "../global";

describe("Global Utils", () => {
  describe("trim", () => {
    it("should remove leading and trailing spaces", () => {
      expect(trim("  hello  ")).toStrictEqual("hello");
      expect(trim("hello")).toStrictEqual("hello");
    });
  });

  describe("trimOptional", () => {
    it("should trim non-empty strings", () => {
      expect(trimOptional("  test  ")).toStrictEqual("test");
    });

    it("should return null for null or undefined input", () => {
      expect(trimOptional(null)).toBeNull();
      expect(trimOptional(undefined)).toBeNull();
    });
  });

  describe("toValidDate", () => {
    it("should parse ISO date strings", () => {
      const result = toValidDate("2024-01-15");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toStrictEqual(2024);
    });

    it("should handle Date objects unchanged", () => {
      const date = new Date("2024-01-15");
      expect(toValidDate(date)).toStrictEqual(date);
    });

    it("should return null for invalid inputs", () => {
      expect(toValidDate("invalid-date")).toBeNull();
      expect(toValidDate(null)).toBeNull();
      expect(toValidDate(undefined)).toBeNull();
    });
  });

  describe("getErrorMessage", () => {
    it("should extract message from Error instance", () => {
      const error = new Error("Something went wrong");
      expect(getErrorMessage(error, "Fallback")).toStrictEqual(
        "Something went wrong",
      );
    });

    it("should return fallback for non-Error objects", () => {
      expect(getErrorMessage("string error", "Fallback")).toStrictEqual(
        "Fallback",
      );
      expect(getErrorMessage(null, "Fallback")).toStrictEqual("Fallback");
    });
  });

  describe("getDocumentStatus", () => {
    const now = new Date("2024-01-15T12:00:00Z");

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return NOT_UPLOADED when file does not exist", () => {
      expect(getDocumentStatus(false, null)).toStrictEqual("Not uploaded");
      expect(getDocumentStatus(false, new Date())).toStrictEqual(
        "Not uploaded",
      );
    });

    it("should return VALID when file exists without expiration date", () => {
      expect(getDocumentStatus(true, null)).toStrictEqual("Valid");
      expect(getDocumentStatus(true, undefined)).toStrictEqual("Valid");
    });

    it("should return EXPIRED for past expiration dates", () => {
      const pastDate = new Date("2024-01-01");
      expect(getDocumentStatus(true, pastDate)).toStrictEqual("Expired");
    });

    it("should return EXPIRING_SOON for dates within 15 days", () => {
      const soonDate = new Date("2024-01-20"); // 5 días en el futuro
      expect(getDocumentStatus(true, soonDate)).toStrictEqual("Expiring soon");
    });

    it("should return VALID for dates more than 15 days away", () => {
      const futureDate = new Date("2024-02-15");
      expect(getDocumentStatus(true, futureDate)).toStrictEqual("Valid");
    });
  });
});
