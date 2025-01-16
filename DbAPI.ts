export type BahnAPIStation = {
  stationName: string;
  stationId: string;
};

type BahnAPIStationTimetable = {
  stationName: string;
  stationId: string;
  trains: {
    entries: BahnAPIStationArrival[];
  };
};

export type BahnAPIStationArrival = {
  bahnhofsId: string;
      name: string;
      zeit: string;
      ezZeit: string;
      gleis: string;
      ueber: string[];
      journeyId: string;
      meldungen: any[];
      verkehrmittel: any;
      terminus: string;
}
type BahnAPIJourney = {
  reisetag: string,
  regulaereVerkehrstage: string,
  zugName: string,
  halte: BahnAPIJourneyStop[],
  priorisierteMeldungen: [],
  zugattribute: [],
}

type BahnAPIJourneyStop = {
  id: string,
  abfahrtsZeitpunkt: Date,
  ankunftsZeitpunkt: string,
  auslastungsmeldungen: [],
  ezAbfahrtsZeitpunkt: Date,
  ezAnkunftsZeitpunkt: string,
  gleis: string,
  name: string,
  risNotizen: []
  bahnhofsInfoId: string,
  extId: string,
  routeIdx: number,
  priorisierteMeldungen: [],
  adminID: string,
  kategorie: string,
  nummer: string,
  delay?: number,
}
export class BahnAPI {
  private baseUrl: string;
  constructor() {
    this.baseUrl = "https://int.bahn.de/web/api/reiseloesung/";
  }

  async getStationIds(stationName: string): Promise<any> {
    const request = await fetch(
      this.baseUrl + "orte?suchbegriff=" + stationName + "&typ=ALL&limit=1",
      { method: "GET" }
    );
    const resolvedRequest = await request.json();
    const newObject: BahnAPIStation = {
      stationName: resolvedRequest[0].name,
      stationId: resolvedRequest[0].extId
    };
    console.log(newObject.stationName);
    
    return newObject;
  }
  async getStationDepartures(
    stationName: string,
    stationId: string
  ): Promise<BahnAPIStationTimetable> {
    const params = new URLSearchParams({
      datum: new Date().toISOString().split("T")[0],
      zeit: new Date().toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour12: false }),
      ortExtId: stationId,
      ortId: stationName,
      mitVias: "false",
      maxVias: "8",
    });
    ["ICE", "EC_IC", "IR", "REGIONAL", "SBAHN"].forEach((item) =>
      params.append("verkehrsmittel", item)
    );
    const request = await fetch(this.baseUrl + "abfahrten?" + params, {
      method: "GET",
    });
    let resolvedRequest: BahnAPIStationTimetable = {
      stationName: "",
      stationId: "",
      trains: {
        entries: [],
      },
    };
    resolvedRequest.stationName = stationName;
    resolvedRequest.stationId = stationId;
    resolvedRequest.trains = await request.json();

    return resolvedRequest as BahnAPIStationTimetable;
  }

  async getStationArrivals(stationName : string, stationId: string): Promise<any> {
    const params = new URLSearchParams({
      datum: new Date().toISOString().split("T")[0],
      zeit: new Date().toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour12: false }),
      ortExtId: stationId,
      ortId: stationName,
      mitVias: "false",
      maxVias: "8",
    });
    ["ICE", "EC_IC", "IR", "REGIONAL", "SBAHN"].forEach((item) =>
      params.append("verkehrsmittel", item)
    );
    const request = await fetch(this.baseUrl + "ankuenfte?" + params, {
      method: "GET",
    });
    let resolvedRequest: BahnAPIStationTimetable = {
      stationName: "",
      stationId: "",
      trains: {
        entries: [],
      },
    };
    resolvedRequest.stationName = stationName;
    resolvedRequest.stationId = stationId;
    resolvedRequest.trains = await request.json();

    return resolvedRequest as BahnAPIStationTimetable;
  }

  async getJourneyDetails(trainId : string) {
    const params = new URLSearchParams({
      journeyId: trainId,
    });
    
    const journeyRequest : BahnAPIJourney = await (await fetch(this.baseUrl + "fahrt?" + params, { method: "GET" })).json();
    
    journeyRequest.halte.forEach((stop) => {
      const calcDelay = (new Date(stop.ezAnkunftsZeitpunkt).getTime() - new Date(stop.ankunftsZeitpunkt).getTime()) / (1000 * 60);
      stop.delay = isNaN(calcDelay) ? 0 : calcDelay;
    });
    
    return journeyRequest;
  }
}
