import snapshot from "@snapshot-labs/snapshot.js"
import * as R from "ramda"
import fetch from "node-fetch"

type SnapshotStrategy = {
  name: string
  params: Record<string, string>
  network: string
}

const SNAPSHOT_HUB = "https://hub.snapshot.org"
const SNAPSHOT_HUB_GOERLI = "https://testnet.snapshot.org"

/**
 * Fetches the and returns the vote weights for each address in a given space.
 *
 * It uses the active strategies for the space to calculate the vote weights
 * (except the delegation strategy).
 *
 * @param spaceName - The space name
 * @param addresses - The addresses to get the vote weights for
 * @param blockNumber - The block number to get the vote weights at
 * @returns a map of address to vote weight
 */
export const fetchVoteWeights = async (
  spaceName: string,
  addresses: string[],
  blockNumber?: number,
): Promise<Record<string, number>> => {
  let strategies = await fetchStrategies(spaceName)
  if (strategies.length === 0) {
    console.log(
      "No strategies found for space: ",
      spaceName,
      " on the snapshot hub. Trying to get test space strategies.",
    )
    // TODO: WARNING: If no snapshot space if found, this tries to get strategies from the Snapshot test hub.
    strategies = await fetchStrategies(spaceName, true)
    if (strategies.length === 0) {
      console.log(
        "Also no strategies found for TEST space: ",
        spaceName,
        " on the snapshot hub.",
      )
      return {}
    }
  }
  return strategies.reduce(async (accPromise, strategy) => {
    const acc = await accPromise
    try {
      const rawScores = await snapshot.utils.getScores(
        spaceName,
        [strategy],
        strategy.network,
        addresses,
        blockNumber,
      )
      const scores = scoresAsObject(rawScores)
      return Object.keys(acc).length === 0
        ? scores
        : R.mergeWith(R.add, acc, scores)
    } catch (error) {
      console.log("error", error)
      return acc
    }
  }, {} as Promise<Record<string, number>>)
}

/**
 * Fetches the strategies for a given space, except the delegation strategy.
 *
 * @param spaceName - The space name
 * @returns the strategies for the space or a empty array if no strategies were found
 */
const fetchStrategies = async (
  spaceName: string,
  testSpace: boolean = false,
): Promise<SnapshotStrategy[]> => {
  try {
    const strategies = await fetchSnapshotSpaceSettings(
      spaceName,
      testSpace,
    ).then((_) => _.strategies)
    return strategies.filter(
      (strategy) =>
        !(
          strategy.name === "api-post" &&
          strategy.params?.api?.includes("/api/delegates/scores")
        ),
    )
  } catch (error) {
    if (error instanceof Error) {
      console.log(
        `${error.name} error fetching strategies for space: ${spaceName}. Message: ${error.message}`,
      )
    }
    return []
  }
}

/**
 * Fetches the settings for a given space.
 *
 * @param spaceName - The space name
 * @param testSpace - Whether to fetch the settings for the test Hub
 * @returns the settings for the space
 */
export const fetchSnapshotSpaceSettings = async (
  spaceName: string,
  testSpace: boolean,
): Promise<{ strategies: SnapshotStrategy[]; network: string }> => {
  const res = await fetch(`${getHubUrl(testSpace)}/api/spaces/${spaceName}`, {})
  if (res.ok) {
    try {
      return res.json()
    } catch (error) {
      throw Error(
        `The response from the Snapshot Hub was not valid JSON. Most likely the space does not exist for ${spaceName}.`,
      )
    }
  } else {
    throw res
  }
}

const getHubUrl = (testSpace: boolean = false) =>
  testSpace ? SNAPSHOT_HUB_GOERLI : SNAPSHOT_HUB

const scoresAsObject = (scores: Array<Record<string, number>>) =>
  scores.reduce((acc, scoreObj) => ({ ...acc, ...scoreObj }), {})
