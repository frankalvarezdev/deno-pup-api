export const generateCmd = (cmd: string) => {
    let cmdArray = cmd.split(' ')
    cmdArray = cmdArray.map((cmd) => cmd.trim())
    // remove empty strings
    return cmdArray.filter((cmd) => !!cmd)
}
