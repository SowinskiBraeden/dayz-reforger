import { bgYellow } from "colors";
import "discord.js";

/**
 * Type augmentation allows us to add custom functions to the
 * ChatInputCommandInteraction without typescript complaining
 */
declare module "discord.js" {
  interface ChatInputCommandInteraction {
    send(
      content: string | { embeds?: (EmbedBuilder | APIEmbed)[]; [key: string]: any }
    ): Promise<unknown>;
    deferReply(
      content?: string | { embeds?: (EmbedBuilder | APIEmbed)[]; [key: string]: any }
    ): Promise<unknown>;
    showModal(
      content: string | { embeds?: (EmbedBuilder | APIEmbed)[]; [key: string]: any }
    ): Promise<unknown>;
    editReply(
      content: string | { embeds?: (EmbedBuilder | APIEmbed)[]; [key: string]: any }
    ): Promise<unknown>;
  }
}
