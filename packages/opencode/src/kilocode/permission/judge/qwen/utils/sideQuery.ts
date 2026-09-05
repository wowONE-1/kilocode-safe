import type { Config, Query } from "../config/config"
export async function runSideQuery<T>(config: Config, input: Query): Promise<T> {
  return (await config.query(input)) as T
}
