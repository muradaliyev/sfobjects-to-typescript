import { DescribeSObjectResult } from "./DescribeResult";
export interface ExtractorConfig {
    describe: DescribeSObjectResult;
    otherTypeNames: string[];
    recTypeDevNames: Record<string, string>;
    instance: string;
}
export declare function extractTypes(o: ExtractorConfig): string;
