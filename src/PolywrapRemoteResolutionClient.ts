import { ClientConfig, InvokeResult, InvokerOptions, PolywrapClient, PolywrapClientConfig, ResolveUriOptions, ResolveUriResult, Uri, UriResolutionHistory, WasmWrapper } from "@polywrap/client-js";
import { deserializeWrapManifest } from "@polywrap/wrap-manifest-types-js";
import axios from "axios";
import { toUri } from "./utils/toUri";

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
      await deserializeWrapManifest(result.data.manifest), 
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
