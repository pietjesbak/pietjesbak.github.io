/**
 * Little helper to filter out undefined elements.
 *
 * @param element Any element.
 */
const filter = (element: any) => element !== undefined;

class BggGameData {
  /**
   * This element's id.
   */
  id: number;

  /**
   * This element's collection id.
   */
  collectionId: number;

  /**
   * The name of the game.
   */
  name: string;

  /**
   * The publish year.
   */
  year?: number;

  /**
   * Game image.
   */
  image: string;

  /**
   * Game thumbnail.
   */
  thumbnail: string;

  /**
   * Game stats.
   */
  stats: BggStatsData;

  /**
   * Game details.
   */
  details?: BggDetailsData | null = undefined;

  /**
   * The amount of requests this month, not part of boardgame geek.
   * This should be filled in by firebase.
   */
  requestsThisMonth = 0;

  /**
   * If this game was requested this month by the current use.
   * This should be filled in by firebase.
   */
  requestedByMe = false;

  /**
   * Data class that represents an item from boardgamegeek.
   *
   * @param node An xml node from boardgamegeek.
   */
  constructor(node: Element) {
    this.id = Number(node.attributes["objectid"].nodeValue);
    this.collectionId = Number(node.attributes["collid"].nodeValue);
    this.name = String(
      node.getElementsByTagName("name")[0].childNodes[0].nodeValue
    );
    this.year = undefined;
    this.image = String(
      node.getElementsByTagName("image")[0].childNodes[0].nodeValue
    );
    this.thumbnail = String(
      node.getElementsByTagName("thumbnail")[0].childNodes[0].nodeValue
    );
    this.stats = new BggStatsData(node.getElementsByTagName("stats")[0]);

    const yearNodes = node.getElementsByTagName("yearpublished");
    if (yearNodes.length === 1) {
      this.year = Number(yearNodes[0].childNodes[0].nodeValue);
    }
  }
}

class BggStatsData {
  /**
   * Min players.
   */
  minPlayers: number;

  /**
   * Max players.
   */
  maxPlayers: number;

  /**
   * Min play time.
   */
  minPlaytime?: number;

  /**
   * Max play time.
   */
  maxPlaytime?: number;

  /**
   * Game rating.
   */
  rating: number;

  /**
   * Data class that represents boardgamegeek stats.
   *
   * @param {item} node An xml node containing the stats.
   */
  constructor(node: Element) {
    this.minPlayers = Number(node.attributes["minplayers"].nodeValue);
    this.maxPlayers = Number(node.attributes["maxplayers"].nodeValue);
    this.minPlaytime =
      node.attributes["minplaytime"] !== undefined
        ? Number(node.attributes["minplaytime"].nodeValue)
        : undefined;
    this.maxPlaytime =
      node.attributes["maxplaytime"] !== undefined
        ? Number(node.attributes["maxplaytime"].nodeValue)
        : undefined;
    this.rating = Number(
      node.getElementsByTagName("average")[0].attributes["value"].nodeValue
    );
  }

  /**
   * Get players string.
   */
  get players() {
    if (this.minPlayers === this.maxPlayers) {
      return `${this.minPlayers} spelers`;
    }

    return `${this.minPlayers} - ${this.maxPlayers} spelers`;
  }

  /**
   * Get playtime string.
   */
  get playtime() {
    if (this.minPlaytime === undefined && this.maxPlaytime === undefined) {
      return "???";
    }

    if (this.minPlaytime === undefined) {
      return `${this.maxPlaytime} minuten`;
    }

    if (this.maxPlaytime === undefined) {
      return `${this.minPlaytime} minuten`;
    }

    if (this.minPlaytime === this.maxPlaytime) {
      return `${this.minPlaytime} minuten`;
    }

    return `${this.minPlaytime} - ${this.maxPlaytime} minuten`;
  }
}

class BggDetailsData {
  /**
   * Game description.
   */
  description: string;

  /**
   * Game categpries.
   */
  categories: string[];

  /**
   * Game family (theme).
   */
  family?: string = undefined;

  /**
   * Game mechanics.
   */
  mechanics: string[];

  /**
   * Game expansions.}
   */
  expansions: Map<number, string>;

  /**
   * Game domain (audience?).
   */
  domain: string[];

  /**
   * Owned expansions.
   */
  ownedExpansions: Map<number, string> = new Map();

  /**
   * Not owned expansions.
   */
  otherExpansions: Map<number, string> = new Map();

  /**
   * Data class that represents boardgamegeek details.
   *
   * @param node  An xml node containing the details.
   * @param games All games.
   */
  constructor(node: Element, games: Map<number, BggGameData>) {
    this.description = String(
      node.getElementsByTagName("description")[0].childNodes[0].nodeValue
    );
    this.categories = [
      ...(node.getElementsByTagName("boardgamecategory") as any),
    ]
      .filter(filter)
      .map((element: Element) => String(element.childNodes[0].nodeValue));

    const familyNodes = node.getElementsByTagName("boardgamefamily");
    if (familyNodes.length === 1) {
      this.family = String(familyNodes[0].childNodes[0].nodeValue);
    }

    this.mechanics = [
      ...(node.getElementsByTagName("boardgamemechanic") as any),
    ]
      .filter(filter)
      .map((element: Element) => String(element.childNodes[0].nodeValue));

    this.expansions = new Map();
    [...(node.getElementsByTagName("boardgameexpansion") as any)]
      .filter(filter)
      .forEach((element: Element) =>
        this.expansions.set(
          Number(element.attributes["objectid"].nodeValue),
          String(element.childNodes[0].nodeValue)
        )
      );

    this.domain = [...(node.getElementsByTagName("boardgamesubdomain") as any)]
      .filter(filter)
      .map((element: Element) => String(element.childNodes[0].nodeValue));

    this.updateOwnedExpansions(games);
  }

  /**
   * Updates the owned and other expansion maps.
   *
   * @param games All games.
   */
  updateOwnedExpansions(games: Map<number, BggGameData>) {
    const entries = [...this.expansions.entries()];

    this.ownedExpansions = new Map();
    entries
      .filter(([id, name]) => games.has(id))
      .forEach(([id, name]) => this.ownedExpansions.set(id, name));

    this.otherExpansions = new Map();
    entries
      .filter(([id, name]) => games.has(id) === false)
      .forEach(([id, name]) => this.otherExpansions.set(id, name));
  }

  /**
   * Get the description as an array of strings without html bits.
   */
  get descriptionArray(): string[] {
    const html = new DOMParser().parseFromString(this.description, "text/html");

    let nextIsProbablyJunk = false;
    return [...(html.body.childNodes as any)].map((node: HTMLElement) => {
      // After a link there seems to be some truncated text (or a br element). Ignore that truncated text, a br returns an empty string anyways.
      if (nextIsProbablyJunk) {
        nextIsProbablyJunk = false;
        return "";
      }

      // @ts-ignore
      if (node.href !== undefined) {
        nextIsProbablyJunk = true;
        return (node as HTMLLinkElement).href;
      }

      if (node.nodeValue !== null) {
        return node.nodeValue;
      }

      return "";
    });
  }
}

export { BggGameData, BggStatsData, BggDetailsData };
