import { UriResolver, Uri, Client, WrapperCache, UriResolutionStack, UriResolutionResult, WasmWrapper } from "@polywrap/client-js";
import { deserializeWrapManifest } from "@polywrap/wrap-manifest-types-js";
import axios from "axios";
import { toUri } from "./utils/toUri";

export class RemoteUriResolver extends UriResolver {
  constructor(private readonly clientProvider: string) {
    super();
  }

  public get name(): string {
    return "RemoteUriResolver";
  }

  public override async resolveUri(
    uri: Uri,
    client: Client,
    cache: WrapperCache,
    resolutionPath: UriResolutionStack
  ): Promise<UriResolutionResult> {
    const result = await axios.post(`${this.clientProvider}/resolveUri`, {
      uri: toUri(uri).uri,
      options: {
        noCacheRead: true
      },
    });

    if(result.status !== 200) {
      throw new Error("Failed to resolve URI");
    }

    const wrapper = new WasmWrapper(
      result.data.uri, 
      deserializeWrapManifest(result.data.manifest), 
      result.data.resolver, 
      undefined
    );

    if(result.data.error) {
      return {
        uri: uri,
        error: new Error(result.data.error),
      };
    } else {
      wrapper["_wasm"] = new Uint8Array(result.data.module);

      const resultUri = result.data.uri
        ? new Uri(result.data.uri)
        : uri;

      return {
        uri: resultUri,
        wrapper,
      };
    }
  }
}