import { PolywrapClient, PolywrapClientConfig, Wrapper } from "@polywrap/client-js";

export class PolywrapClientWithCustomCache extends PolywrapClient {
  constructor(config?: Partial<PolywrapClientConfig>, options?: {
    noDefaults?: boolean;
    cache?: Map<string, Wrapper>
  }) {
    super(config);

    if(options?.cache) {
      this["_wrapperCache"] = options.cache;
    }
  }
}