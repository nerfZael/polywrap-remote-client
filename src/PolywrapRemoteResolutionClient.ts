import { ClientConfig, deserializePolywrapManifest, InvokeResult, InvokerOptions, PolywrapClient, PolywrapClientConfig, ResolveUriOptions, ResolveUriResult, Uri, UriResolutionHistory, WasmWrapper } from "@polywrap/client-js";
import axios from "axios";

export class PolywrapRemoteResolutionClient extends PolywrapClient {
  constructor(private readonly clientProvider: string, config?: Partial<PolywrapClientConfig>, options?: {
    noDefaults?: boolean;
  }){
    super(config);
  }

  public override async resolveUri<TUri extends string | Uri>(
    uri: TUri, options?: ResolveUriOptions<ClientConfig<string>> | undefined
  ): Promise<ResolveUriResult> {
    const result = await axios.post(`${this.clientProvider}/resolveUri`, {
      uri: toUri(uri).uri,
      options,
    });

    if(result.status !== 200) {
      throw new Error("Failed to resolve URI");
    }

    const wrapper = new WasmWrapper(
      result.data.uri, 
      deserializePolywrapManifest(result.data.manifest), 
      result.data.resolver, 
      undefined
    );

    wrapper["_wasm"] = new Uint8Array(result.data.module);

    return {
      uri: result.data.uri,
      wrapper,
      uriHistory: new UriResolutionHistory([]),
    } as ResolveUriResult;
  }
}

export const toUri = (uri: Uri | string): Uri => {
  if (typeof uri === "string") {
    return new Uri(uri);
  } else if (Uri.isUri(uri)) {
    return uri;
  } else {
    throw Error(`Unknown uri type, cannot convert. ${JSON.stringify(uri)}`);
  }
};
