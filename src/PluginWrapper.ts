import {
  Wrapper,
  Client,
  GetManifestOptions,
  InvokeOptions,
  InvokeResult,
  PluginModule,
  PluginPackage,
  Uri,
  AnyManifestArtifact,
  ManifestArtifactType,
  GetFileOptions,
  Env,
  msgpackEncode,
  msgpackDecode,
} from "@polywrap/core-js";

export class PluginWrapper extends Wrapper {
  private _instance: PluginModule<unknown> | undefined;

  private _sanitizedEnv: Record<string, unknown> | undefined = undefined;

  constructor(
    private _uri: Uri,
    private _plugin: PluginPackage<unknown>,
    private _clientEnv?: Env<Uri>
  ) {
    super();
  }

  public async getSchema(_client: Client): Promise<string> {
    return Promise.resolve(this._plugin.manifest.schema);
  }

  public async getManifest<T extends ManifestArtifactType>(
    _options: GetManifestOptions<T>,
    _client: Client
  ): Promise<AnyManifestArtifact<T>> {
    throw Error("client.getManifest(...) is not implemented for Plugins.");
  }

  public async getFile(
    _options: GetFileOptions,
    _client: Client
  ): Promise<Uint8Array | string> {
    throw Error("client.getFile(...) is not implemented for Plugins.");
  }

  public async invoke<TData = unknown>(
    options: InvokeOptions<Uri>,
    client: Client
  ): Promise<InvokeResult<TData>> {
    try {
      const { method } = options;
      const args = options.args || {};
      const module = this._getInstance();

      if (!module) {
        throw new Error(`PluginWrapper: module "${module}" not found.`);
      }

      if (!module.getMethod(method)) {
        throw new Error(`PluginWrapper: method "${method}" not found.`);
      }

      // Sanitize & load the module's environment
      await this._sanitizeAndLoadEnv(client, module);

      let jsArgs: Record<string, unknown> | Uint8Array;

      // If the args are a msgpack buffer, deserialize it
      if (args instanceof ArrayBuffer) {
        const result = msgpackDecode(args);

        if (typeof result !== "object") {
          throw new Error(
            `PluginWrapper: decoded MsgPack args did not result in an object.\nResult: ${result}`
          );
        }

        jsArgs = result as Record<string, unknown>;
      } else {
        jsArgs = args;
      }

      // Invoke the function
      try {
        const result = (await module._wrap_invoke(
          method,
          jsArgs as Record<string, unknown>,
          client
        )) as TData;

        if (result !== undefined) {
          const data = result as unknown;

          if (process.env.TEST_PLUGIN) {
            // try to encode the returned result,
            // ensuring it's msgpack compliant
            try {
              msgpackEncode(data);
            } catch (e) {
              throw Error(
                `TEST_PLUGIN msgpack encode failure.` +
                  `uri: ${this._uri.uri}\nmodule: ${module}\n` +
                  `method: ${method}\n` +
                  `args: ${JSON.stringify(jsArgs, null, 2)}\n` +
                  `result: ${JSON.stringify(data, null, 2)}\n` +
                  `exception: ${e}`
              );
            }
          }

          return {
            data: data as TData,
          };
        } else {
          return {};
        }
      } catch (e) {
        throw Error(
          `PluginWrapper: invocation exception encountered.\n` +
            `uri: ${this._uri.uri}\nmodule: ${module}\n` +
            `method: ${method}\n` +
            `args: ${JSON.stringify(jsArgs, null, 2)}\n` +
            `exception: ${(e as Error).message}`
        );
      }
    } catch (error) {
      return {
        error: error as Error,
      };
    }
  }

  private _getInstance(): PluginModule<unknown> {
    this._instance ||= this._plugin.factory();
    return this._instance;
  }

  private async _sanitizeAndLoadEnv(
    client: Client,
    pluginModule: PluginModule<unknown>
  ): Promise<void> {
    if (this._sanitizedEnv === undefined) {
      const clientEnv = this._getClientEnv();
      this._sanitizedEnv = await pluginModule._wrap_sanitize_env(
        clientEnv,
        client
      );
    }

    pluginModule._wrap_load_env(this._sanitizedEnv || {});
  }

  private _getClientEnv(): Record<string, unknown> {
    if (!this._clientEnv?.env) {
      return {};
    }
    return this._clientEnv.env;
  }
}
