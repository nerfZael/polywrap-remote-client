import { Wrapper, Uri } from "@polywrap/client-js";

export class ExpirableWrapperCache extends Map<string, Wrapper> {
  map: Map<string, number> = new Map<string, number>();
  constructor(private readonly config: Record<string, number>) {
    super();
  }

  public override get(key: string): Wrapper | undefined {
    const autority = new Uri(key).authority;

    if(!this.config[autority]) {
      return super.get(key);
    } else {
      const lastTime = this.map.get(key);

      if(!lastTime) {
        return undefined;
      }

      if((new Date().getTime() - lastTime) > this.config[autority]) {
        this.map.delete(key);
        return undefined;
      } else {
        return super.get(key);
      }
    }
  }

  public override set(key: string, value: Wrapper): this {
    const autority = new Uri(key).authority;

    if(!this.config[autority]) {
      return super.set(key, value);
    } else {
      const lastTime = this.map.get(key) ?? 0;

      if((new Date().getTime() - lastTime) > this.config[autority]) {
        this.map.set(key, new Date().getTime());
        return super.set(key, value); 
      } else {
        return this;
      }
    }
  }
}