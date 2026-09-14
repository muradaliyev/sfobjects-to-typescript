import { SfConnectorOptions } from './SfConnector';
export interface ExtractOptions extends SfConnectorOptions {
    objects: string[];
    output?: string;
    client?: boolean;
}
export declare function exctract(o: ExtractOptions): Promise<void>;
