import { DescribeSObjectResult } from "./DescribeResult";
export declare function generateSimpleIndex(describes: Record<string, DescribeSObjectResult>, instance: string): string;
export declare function generateIndex(describes: Record<string, DescribeSObjectResult>, recTypeDevNames: Record<string, Record<string, string>>, instance: string): string;
