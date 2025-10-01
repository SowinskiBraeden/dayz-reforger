import winston from "winston";
import colors  from "colors";

export default class Logger {
    
    public logger: winston.Logger;

    constructor(loggingFile: string)
    {
        this.logger = winston.createLogger({
            transports: [new winston.transports.File({ filename: loggingFile })],
        });
    }

    log(text: string): void
    {
        let d = new Date();
        this.logger.log({
            level: "info",
            message:
                `${d.getHours()}:${d.getMinutes()} - ${d.getMonth() + 1}:${d.getDate()}:${d.getFullYear()} | Info: ` + text
        });
        console.log(
            colors.green(
                `${d.getMonth() + 1}:${d.getDate()}:${d.getFullYear()} - ${d.getHours()}:${d.getMinutes()}`
            ) + colors.yellow(" | Info: " + text)
        );
    }

    error(text: string): void
    {
        let d = new Date();
        this.logger.log({
            level: "error",
            message:
                `${d.getHours()}:${d.getMinutes()} - ${d.getMonth() + 1}:${d.getDate()}:${d.getFullYear()} | Error: ` + text
        });
        console.log(
            colors.green(
                `${d.getMonth() + 1}:${d.getDate()}:${d.getFullYear()} - ${d.getHours()}:${d.getMinutes()}`
            ) + colors.yellow(" | Error: ") + colors.red(text)
        );
    }
}
