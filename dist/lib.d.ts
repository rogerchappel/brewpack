import { type BrewpackPlan, type PackageSpec } from './core.js';
export interface InspectionResult {
    spec: PackageSpec;
    plan: BrewpackPlan;
}
export interface InitTapOptions {
    force?: boolean;
    dryRun?: boolean;
}
export declare function inspectProject(inputDir: string): Promise<InspectionResult>;
export declare function previewTap(inputDir: string, outputDir: string): Promise<{
    spec: PackageSpec;
    plan: BrewpackPlan;
    paths: {
        root: string;
        formulaDir: string;
        formulaFile: string;
        readmeFile: string;
        planFile: string;
    };
    files: {
        [x: string]: string;
    };
}>;
export declare function initTap(inputDir: string, outputDir: string, { force, dryRun }?: InitTapOptions): Promise<{
    written: boolean;
    spec: PackageSpec;
    plan: BrewpackPlan;
    paths: {
        root: string;
        formulaDir: string;
        formulaFile: string;
        readmeFile: string;
        planFile: string;
    };
    files: {
        [x: string]: string;
    };
}>;
export declare function validateTap(targetDir: string): Promise<import("./core.js").TapValidationResult>;
