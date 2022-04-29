import webTorrentHealth from "webtorrent-health";
import type { TorrentsHealth } from "../../utilities/interfaces";

export default class TorrentsHealthService {
  public static getTorrentsHealth = async (
    magnet: string
  ): Promise<TorrentsHealth> => {
    const response: any = await webTorrentHealth(magnet, {
      timeout: 5000,
    });

    const results: TorrentsHealth = {
      webtorrent: {
        num_trackers: 0,
        seeders: 0,
        peers: 0,
      },
      bittorrent: {
        num_trackers: 0,
        seeders: 0,
        peers: 0,
      },
    };

    for (let i = 0; i < response.extra.length; i++) {
      const info = response.extra[i];
      if (info.error) continue;

      let torrent;
      if (info.tracker.indexOf("wss") >= 0) {
        torrent = results.webtorrent;
      } else {
        torrent = results.bittorrent;
      }

      torrent.num_trackers++;
      torrent.seeders += info.seeds;
      torrent.peers += info.peers;
    }

    // Calculate average
    if (results.webtorrent.num_trackers === 0)
      results.webtorrent.num_trackers = 1;
    if (results.bittorrent.num_trackers === 0)
      results.bittorrent.num_trackers = 1;
    results.webtorrent.seeders = Math.round(
      results.webtorrent.seeders / results.webtorrent.num_trackers
    );
    results.webtorrent.peers = Math.round(
      results.webtorrent.peers / results.webtorrent.num_trackers
    );
    results.bittorrent.seeders = Math.round(
      results.bittorrent.seeders / results.bittorrent.num_trackers
    );
    results.bittorrent.peers = Math.round(
      results.bittorrent.peers / results.bittorrent.num_trackers
    );

    return results;
  };
}
