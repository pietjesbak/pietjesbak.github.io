import { Inventory } from "./Inventory";

describe("Inventory", () => {
  it("Gets the correct next event date", async () => {
    const inventory = new Inventory() as any;
    inventory.getMessage = async () => {
      return {
        title: "",
        body: "",
        date: new Date(0),
      };
    };

    const _Date = Date;

    const date1 = await inventory.getNextEventDate();
    expect(date1).toMatchSnapshot();

    // @ts-ignore
    Date = jest.fn((date) =>
      typeof date === "undefined"
        ? new _Date("September 20 2018 10:20")
        : new _Date(date)
    );

    const date2 = await inventory.getNextEventDate(2);
    expect(date2).toMatchSnapshot();

    // september 20th is the third friday of the month. September 21th should tick over to the next month.
    // @ts-ignore
    Date = jest.fn((date) =>
      typeof date === "undefined"
        ? new _Date("September 21 2018 10:20")
        : new _Date(date)
    );

    const date3 = await inventory.getNextEventDate();
    expect(date3).toMatchSnapshot();

    // @ts-ignore
    Date = _Date;
  });

  it("Gets the correct next event date with confirmation", async () => {
    const inventory = new Inventory() as any;
    inventory.getMessage = async () => {
      return {
        title: "",
        body: "",
        date: new Date("September 25 2018 19:30"),
      };
    };

    const date = await inventory.getNextEventDate();
    expect(date).toMatchSnapshot();
  });

  it("Fetches all the games", async () => {
    window.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        text: jest.fn(() =>
          Promise.resolve(
            '<?xml version="1.0" encoding="utf-8" standalone="yes"?><items totalitems="219" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse" pubdate="Wed, 19 Sep 2018 08:55:42 +0000"><item objecttype="thing" objectid="9999" subtype="boardgame" collid="1234"><name sortindex="1">Game 1</name><yearpublished>1989</yearpublished><image>https://via.placeholder.com/500x500</image><thumbnail>https://via.placeholder.com/250x150</thumbnail><stats minplayers="2" maxplayers="4" minplaytime="30" maxplaytime="30" playingtime="30" numowned="6666"><rating value="N/A"><usersrated value="2804" /><average value="6.49274" /><bayesaverage value="6.19497" /><stddev value="1.22646" /><median value="0" /></rating></stats><status own="1" prevowned="0" fortrade="0" want="0" wanttoplay="0" wanttobuy="0" wishlist="0" preordered="0" lastmodified="2014-05-12 04:06:13" /><numplays>0</numplays></item><item objecttype="thing" objectid="8888" subtype="boardgame" collid="1234"><name sortindex="1">Game 2</name><yearpublished>2010</yearpublished><image>https://via.placeholder.com/500x500</image><thumbnail>https://via.placeholder.com/250x150</thumbnail><stats minplayers="2" maxplayers="5" minplaytime="30" maxplaytime="30" playingtime="30" numowned="5555"><rating value="N/A"><usersrated value="378" /><average value="6.80164" /><bayesaverage value="5.81929" /><stddev value="1.27866" /><median value="0" /></rating></stats><status own="1" prevowned="0" fortrade="0" want="0" wanttoplay="0" wanttobuy="0" wishlist="0" preordered="0" lastmodified="2017-12-26 07:06:47" /><numplays>0</numplays></item></items>'
          )
        ),
      })
    ) as any;
    const inventory = new Inventory();

    expect(await inventory.getGames()).toMatchSnapshot();
  });
});
