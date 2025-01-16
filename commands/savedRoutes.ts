import type { CommandInteraction } from "discord.js";
import { Discord, Slash } from "discordx";

@Discord()
export class SavedRoutes {
  @Slash({ description: "Gets your saved routes.", name: "starred"  })
  savedroutes(interaction: CommandInteraction) {
    interaction.reply({ content: "Hello, World!", ephemeral: true });
    
  }
}