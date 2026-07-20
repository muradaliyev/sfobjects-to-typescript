import { SfConnectorOptions } from './SfConnector';
export interface ExtractOptions extends SfConnectorOptions {
    objects: string[];
    output?: string;
}
export declare function exctract(o: ExtractOptions): Promise<void>;
