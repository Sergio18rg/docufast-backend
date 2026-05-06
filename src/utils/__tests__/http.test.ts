import { Response } from "express";
import { sendSuccess, sendError } from "../http";

describe("HTTP Utils", () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("sendSuccess", () => {
    it("should send success response with data", () => {
      const data = { id: 1, name: "Test" };
      sendSuccess(mockResponse as Response, data);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        data,
      });
    });

    it("should send success with custom status and message", () => {
      const data = { id: 1 };
      sendSuccess(mockResponse as Response, data, "Created successfully", 201);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Created successfully",
        data,
      });
    });
  });

  describe("sendError", () => {
    it("should send error response with custom status and message", () => {
      sendError(mockResponse as Response, "Not found", 404);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Not found",
      });
    });

    it("should include details when provided", () => {
      const details = { field: "email", issue: "invalid format" };
      sendError(mockResponse as Response, "Validation error", 400, details);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Validation error",
        details,
      });
    });
  });
});
