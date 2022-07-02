import { InvokeResult, InvokerOptions, PolywrapClient, PolywrapClientConfig, Uri } from "@polywrap/client-js";
import axios from "axios";

export class PolywrapRemoteExecutionClient extends PolywrapClient {
  constructor(private readonly clientProvider: string, config?: Partial<PolywrapClientConfig>, options?: {
    noDefaults?: boolean;
  }){
    super(config);
  }

  public override async invoke<TData = unknown, TUri extends string | Uri = string>(
    options: InvokerOptions<TUri, PolywrapClientConfig<string>>
  ): Promise<InvokeResult<TData>> {
    const result = await axios.post(`${this.clientProvider}/invoke`, {
      uri: options.uri,
      method: options.method,
      args: options.args
    });
    
    return {
      data: result.data.data,
      error: result.data.error 
        ? new Error(result.data.error)
        : undefined
    } as InvokeResult<TData>;
  }
}