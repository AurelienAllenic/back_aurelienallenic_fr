describe("Setup Jest", () => {
  it("le setup fonctionne : NODE_ENV et MONGO_SECRET_KEY sont définis", () => {
    expect(process.env.NODE_ENV).toBe("test");
    expect(process.env.MONGO_SECRET_KEY).toBeDefined();
    expect(process.env.MONGO_SECRET_KEY).toMatch(/^mongodb:\/\//);
  });
});
