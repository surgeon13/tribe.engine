/**
 * @typedef {object} LeaderResources
 * @property {number} wood
 * @property {number} clay
 * @property {number} iron
 * @property {number} crop
 */

/**
 * @typedef {object} LeaderEntry
 * @property {number} rank
 * @property {string} id
 * @property {string} name
 * @property {number} points
 * @property {LeaderResources} resources
 * @property {number} [population]
 * @property {number} [villages]
 */

/**
 * @typedef {object} LeaderSnapshot
 * @property {string} timestamp ISO-8601
 * @property {number} pollMs elapsed ms for this poll
 * @property {string} adapter
 * @property {LeaderEntry[]} leaders
 */

/**
 * @typedef {object} MonitorConfig
 * @property {boolean} enabled
 * @property {number} pollIntervalMs
 * @property {number} topCount
 * @property {'mock'|'travian'} adapter
 * @property {string|null} serverUrl
 * @property {boolean} terminalOutput
 * @property {boolean} storeSnapshots
 * @property {number} maxSnapshots
 * @property {number} raidActivityThreshold aggregate resource delta per poll
 * @property {number} raidIdlePolls consecutive low polls before raid session ends
 */

/**
 * @typedef {object} RateWindow
 * @property {string} label
 * @property {number} windowMs
 * @property {number} pointsPerHour
 * @property {LeaderResources} resourcesPerHour
 * @property {number} totalResourcesPerHour
 */

/**
 * @typedef {object} RaidSession
 * @property {string} start
 * @property {string} end
 * @property {number} durationMs
 * @property {number} pointsGained
 * @property {LeaderResources} resourcesRaised
 * @property {number} totalResourcesRaised
 * @property {'active'|'ended'} status
 */

/**
 * @typedef {object} MonitorAnalytics
 * @property {LeaderSnapshot|null} latest
 * @property {LeaderSnapshot|null} previous
 * @property {RateWindow[]} rates
 * @property {RaidSession[]} raids
 * @property {{ points: number, resources: LeaderResources, totalResources: number }} aggregate
 * @property {number} snapshotCount
 */
