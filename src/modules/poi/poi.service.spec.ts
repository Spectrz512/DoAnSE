import { PoiService } from "./poi.service";
describe("PoiService", () => {
  it("delegates nearby lookup to repository", async () => {
    const repository = { findNearby: jest.fn().mockResolvedValue([]) };
    const service = new PoiService(repository as never);
    await expect(
      service.nearby({
        latitude: 16.1,
        longitude: 108.2,
        radiusM: 100,
        language: "vi",
      }),
    ).resolves.toEqual([]);
    expect(repository.findNearby).toHaveBeenCalledWith(16.1, 108.2, 100, "vi");
  });
});
