import { generateToken, verifyToken } from "../jwt";

describe("JWT Utils", () => {
  const validPayload = {
    user_id: 1,
    email: "test@example.com",
    role: "Administrator",
  };

  describe("generateToken", () => {
    it("should generate valid JWT with payload data", () => {
      const token = generateToken(validPayload);
      const decoded = verifyToken(token) as any;

      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
      expect(decoded.user_id).toBe(validPayload.user_id);
      expect(decoded.email).toBe(validPayload.email);
      expect(decoded.role).toBe(validPayload.role);
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe("verifyToken", () => {
    it("should verify and decode valid token", () => {
      const token = generateToken(validPayload);
      const decoded = verifyToken(token) as any;

      expect(decoded.user_id).toBe(validPayload.user_id);
      expect(decoded.email).toBe(validPayload.email);
      expect(decoded.role).toBe(validPayload.role);
    });

    it("should throw error for invalid tokens", () => {
      expect(() => verifyToken("invalid.token.here")).toThrow();
      expect(() => verifyToken("notavalidtoken")).toThrow();
    });
  });
});
