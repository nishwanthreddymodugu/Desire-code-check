import TemplateService from "../template.service";
import TemplateDAO from "../../daos/template.dao";
import VerticalDAO from "../../daos/vertical.dao";

jest.mock("../../daos/template.dao", () => ({
    __esModule: true,
    default: {
        save: jest.fn(),
        list: jest.fn(),
        findById: jest.fn(),
    },
}));

jest.mock("../../daos/vertical.dao", () => ({
    __esModule: true,
    default: {
        save: jest.fn(),
        list: jest.fn(),
        findById: jest.fn(),
    },
}));

const mockedTemplateDAO = TemplateDAO as unknown as {
    save: jest.Mock;
    list: jest.Mock;
    findById: jest.Mock;
};

const mockedVerticalDAO = VerticalDAO as unknown as {
    save: jest.Mock;
    list: jest.Mock;
    findById: jest.Mock;
};

describe("TemplateService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("save", () => {
        it("requires a templatename", async () => {
            await expect(
                TemplateService.save({ verticalId: 1 } as any)
            ).rejects.toThrow("templatename is required.");
        });

        it("requires a verticalId", async () => {
            await expect(
                TemplateService.save({ templatename: "Email" } as any)
            ).rejects.toThrow("verticalId is required.");
        });

        it("rejects duplicates within the same vertical", async () => {
            mockedTemplateDAO.list.mockResolvedValueOnce([
                { templateId: 2, templateName: "Email", verticalId: 1 },
            ]);

            await expect(
                TemplateService.save({ templatename: "Email", verticalId: 1 })
            ).rejects.toThrow(
                "templatename already exists under this vertical, please use another name."
            );

            expect(mockedTemplateDAO.save).not.toHaveBeenCalled();
        });

        it("rejects duplicates across other verticals", async () => {
            mockedTemplateDAO.list
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([
                    { templateId: 3, templateName: "Email", verticalId: 2 },
                ]);

            await expect(
                TemplateService.save({ templatename: "Email", verticalId: 1 })
            ).rejects.toThrow(
                "templatename already exists in a different vertical, use another name."
            );

            expect(mockedTemplateDAO.save).not.toHaveBeenCalled();
        });

        it("rejects when the parent vertical cannot be found", async () => {
            mockedTemplateDAO.list
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);
            mockedVerticalDAO.findById.mockResolvedValueOnce(null);

            await expect(
                TemplateService.save({ templatename: "Email", verticalId: 1 })
            ).rejects.toThrow(
                "Cannot save template because Vertical with ID '1' does not exist."
            );
        });

        it("saves a template when validation passes", async () => {
            mockedTemplateDAO.list
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);
            mockedVerticalDAO.findById.mockResolvedValueOnce({
                verticalId: 1,
                verticalName: "Sales",
            });
            mockedTemplateDAO.save.mockResolvedValueOnce({
                templateId: 5,
                templateName: "Email",
                verticalId: 1,
            });

            const result = await TemplateService.save({
                templatename: "Email",
                verticalId: 1,
            });

            expect(mockedTemplateDAO.save).toHaveBeenCalledWith({
                templateId: undefined,
                templateName: "Email",
                verticalId: 1,
            });
            expect(result).toEqual({
                templateId: 5,
                templatename: "Email",
                verticalId: 1,
            });
        });
    });

    describe("list", () => {
        it("returns templates mapped to TemplateOut", async () => {
            mockedTemplateDAO.list.mockResolvedValueOnce([
                { templateId: 1, templateName: "Email", verticalId: 10 },
            ]);

            const result = await TemplateService.list(10);

            expect(mockedTemplateDAO.list).toHaveBeenCalledWith({
                where: { verticalId: 10 },
                order: [["templateName", "ASC"]],
            });
            expect(result).toEqual([
                { templateId: 1, templatename: "Email", verticalId: 10 },
            ]);
        });
    });
});
