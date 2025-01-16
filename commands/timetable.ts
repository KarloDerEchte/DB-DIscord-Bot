import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder,
  TextChannel,
} from "discord.js";
import { Discord, Slash, SlashChoice, SlashOption } from "discordx";
import { BahnAPI, type BahnAPIStationArrival } from "../DbAPI";


interface TrainEntry {
  shortId: string;
  line: string;
  destination: string;
  value: string;
}
const BahnAPIInstance = new BahnAPI();

@Discord()
export class timetable {
  @Slash({
    description: "Get Arrivals/Depatures from a Train Station",
    name: "timetable",
  })
  async timetable(
    @SlashChoice("arrivals", "depatures")
    @SlashOption({
      description: "Choose Arrival or Departure",
      name: "type",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    type: string,
    @SlashOption({
      description: "The name of the Station",
      name: "station",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    stationName: string,
    interaction: CommandInteraction
  ) {
    console.log("stationName: ", stationName);
    
    
    try {
      await interaction.deferReply();
      
      const getStationId = await BahnAPIInstance.getStationIds(stationName);
      let { embed, journeyIdMap, mappedEntries } = await fetchAndBuildEmbed(type, getStationId.stationId, getStationId.stationName);
      
      const switchButton = new ButtonBuilder()
      .setCustomId("switch_view_button")
      .setLabel(type === "arrivals" ? "Switch to Departures" : "Switch to Arrivals")
      .setStyle(ButtonStyle.Secondary);
      
      const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("train_select_menu")
      .setPlaceholder("Select a train to view details")
      .addOptions(
        mappedEntries.map((entry: any) => ({
          label: `Train ${entry.line} ${type === "arrivals" ? "from" : "to"} ${entry.destination}`,
          value: entry.shortId,
        }))
      );
      
      const row = new ActionRowBuilder().addComponents(switchButton);
      const selectRow = new ActionRowBuilder().addComponents(selectMenu);
      
      await interaction.editReply({ embeds: [embed], components: [row as any, selectRow as any] });
      
      const collector = (interaction.channel as TextChannel)?.createMessageComponentCollector({ time: 3600000 });
      
      collector?.on("collect", async (i: any) => {
        if (i.customId === "train_select_menu") {
          const selectedShortId = i.values[0];
          const originalId = journeyIdMap.get(selectedShortId);
          const getJourney = await BahnAPIInstance.getJourneyDetails(originalId);
          
          const stops = getJourney.halte.map((stop, i) => {
            if (stop.priorisierteMeldungen.some((m: any) => m.type === "HALT_AUSFALL")) {
              return `~~${stop.name}~~ (Cancelled)`;
            }
            if (i === 0 || i === getJourney.halte.length - 1) {
              return `**${stop.name}**`;
            }
            return stop.name;
          }).join("\n");
            const arrivalDepartureTimes = getJourney.halte.map((stop) => {
            const arrivalDelay = (new Date(stop.ezAnkunftsZeitpunkt).getTime() - new Date(stop.ankunftsZeitpunkt).getTime()) / (1000 * 60);
            const departureDelay = (new Date(stop.ezAbfahrtsZeitpunkt).getTime() - new Date(stop.abfahrtsZeitpunkt).getTime()) / (1000 * 60);
            
            const arrivalTime = stop.ezAnkunftsZeitpunkt ? new Date(stop.ezAnkunftsZeitpunkt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) : "N/A";
            
            const departureTime = stop.ezAbfahrtsZeitpunkt ? new Date(stop.ezAbfahrtsZeitpunkt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) : "N/A";
            
            const arrivalString = arrivalDelay ? `${arrivalTime} (+${arrivalDelay} min)` : arrivalTime;
            const departureString = departureDelay ? `${departureTime} (+${departureDelay} min)` : departureTime;
            
            return `${arrivalString} - ${departureString}`;
            }).join("\n");
          
          const information = getJourney.zugattribute?.map((attr: any) => {
            return `${attr.key} - ${attr.value}`;
          }).join("\n");
          const track = getJourney.halte.map((stop) => stop.gleis).join("\n");
          const meldungen = getJourney.priorisierteMeldungen?.length > 0
          ? getJourney.priorisierteMeldungen.map((meldung: any) => {
            return `${meldung.prioritaet} - ${meldung.text}`;
          }).join("\n")
            : "N/A";
            
            const journeyEmbed = new EmbedBuilder()
            .setTitle(`Journey Details for Train ${getJourney.zugName}`)
            .addFields(
              { name: "Stop", value: stops, inline: true },
              { name: "Track", value: track, inline: true },
              { name: "Arrival Departure Time", value: arrivalDepartureTimes, inline: true },
              { name: "Reports", value: meldungen, inline: false },
              { name: "Information", value: information, inline: false }
            )
            .setColor("#ffcc00")
            .setTimestamp();
            
            const backButton = new ButtonBuilder()
            .setCustomId("back_to_main_view")
            .setLabel("Back")
            .setStyle(ButtonStyle.Secondary);
            
            const backRow = new ActionRowBuilder().addComponents(backButton);
            
            await i.update({ embeds: [journeyEmbed], components: [backRow] });
          } else if (i.customId === "switch_view_button") {
            type = type === "arrivals" ? "departures" : "arrivals";
            const newLabel = type === "arrivals" ? "Switch to Departures" : "Switch to Arrivals";
            const result = await fetchAndBuildEmbed(type, getStationId.stationId, getStationId.stationName);
            stationName = getStationId.stationName;
            embed = result.embed;
            journeyIdMap = result.journeyIdMap;
            mappedEntries = result.mappedEntries;
            const updatedSelectMenu = new StringSelectMenuBuilder()
            .setCustomId("train_select_menu")
            .setPlaceholder("Select a train to view details")
            .addOptions(
              mappedEntries.map((entry: TrainEntry) => ({
              label: `Train ${entry.line} ${type === "arrivals" ? "from" : "to"} ${entry.destination}`,
              value: entry.shortId,
            }))
          );
          
          const updatedSelectRow = new ActionRowBuilder().addComponents(updatedSelectMenu);
          
          const updatedSwitchButton = new ButtonBuilder()
          .setCustomId("switch_view_button")
          .setLabel(newLabel)
          .setStyle(ButtonStyle.Secondary);
          
          const updatedRow = new ActionRowBuilder().addComponents(updatedSwitchButton);
          
          await i.update({ embeds: [embed], components: [updatedRow, updatedSelectRow] });
        } else if (i.customId === "back_to_main_view") {
          const result = await fetchAndBuildEmbed(type, getStationId.stationId, stationName);
          embed = result.embed;
          journeyIdMap = result.journeyIdMap;
          mappedEntries = result.mappedEntries;
          const updatedSelectMenu = new StringSelectMenuBuilder()
          .setCustomId("train_select_menu")
          .setPlaceholder("Select a train to view details")
          .addOptions(
            mappedEntries.map((entry: TrainEntry) => ({
              label: `Train ${entry.line} ${type === "arrivals" ? "from" : "to"} ${entry.destination}`,
              value: entry.shortId,
            }))
          );
          
          const updatedSelectRow = new ActionRowBuilder().addComponents(updatedSelectMenu);
          
          const updatedSwitchButton = new ButtonBuilder()
          .setCustomId("switch_view_button")
          .setLabel(type === "arrivals" ? "Switch to Departures" : "Switch to Arrivals")
          .setStyle(ButtonStyle.Secondary);
          
          const updatedRow = new ActionRowBuilder().addComponents(updatedSwitchButton);
          
          await i.update({ embeds: [embed], components: [updatedRow, updatedSelectRow] });
        }
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "An error occurred while fetching the train information.",
      });
    }
  }
}


// ##############################################
// ############# Embed Builder ##################
// ##############################################
const fetchAndBuildEmbed = async (type: string, stationId: string, stationName: string) => {
  const getTrains = type === "arrivals"
    ? await BahnAPIInstance.getStationArrivals(stationName, stationId)
    : await BahnAPIInstance.getStationDepartures(stationName, stationId);

  if (getTrains.trains.entries.length > 15) {
    getTrains.trains.entries = getTrains.trains.entries.slice(0, 15);
  }

  const journeyIdMap = new Map();
  const mappedEntries = getTrains.trains.entries.map((train: any, index: number) => {
    console.log(train);
    
    const shortId = (index + 1).toString();
    journeyIdMap.set(shortId, train.journeyId);
    return {
      shortId,
      line: train.verkehrmittel.name,
      destination: train.terminus,
      track: train.gleis,
      meldungen: train.meldungen,
      prioriesierteMeldungen: train.priorisierteMeldungen,  
      value: shortId,
    };
  });

  console.log("mappedEntries: ", mappedEntries);
  
  const lines = mappedEntries.map((entry: any) => `(Track ${entry.track}) ${entry.line}`).join("\n");
  const destinations = mappedEntries.map((entry: any) => `${entry.destination}`).join("\n");
  const times = getTrains.trains.entries.map((train: any) => {
    const actualTime = new Date(train.ezZeit).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const time = new Date(train.zeit).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const delay = (new Date(train.ezZeit).getTime() - new Date(train.zeit).getTime()) / (1000 * 60);
    return time + (isNaN(new Date(train.ezZeit).getTime()) ? '' : (delay === 0 ? '' : ` (${actualTime} +${delay} min)`));
  }).join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`**${type.charAt(0).toUpperCase() + type.slice(1)} at ${stationName}**`)
    .addFields(
      { name: "Line", value: lines, inline: true },
      { name: type === "arrivals" ? "Origin" : "Destination", value: destinations, inline: true },
      { name: "Time", value: times, inline: true }
    )
    .setColor("#00b0f4")
    .setTimestamp();

  return { embed, journeyIdMap, mappedEntries };
};