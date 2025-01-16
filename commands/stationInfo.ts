import type { CommandInteraction } from "discord.js";
import { Discord, Slash } from "discordx";

@Discord()
export class stationInfo {
  @Slash({ description: "Get Arrivals/Depatures from a Train Station", name: "station"  })
  stationInfo(interaction: CommandInteraction) {
    interaction.reply({ content: "Hello, World!", ephemeral: true });
    
  }
}