/**
 * Check the existing localization files for any missing keys
 * @return {Promise}      A Promise which resolves once the check is completed
 */
export const checkLocalizations = async function() {
  // ui.notifications.info(`Applying BITD Actors migration for version ${game.system.data.version}. Please be patient and do not close your game or shut down your server.`, {permanent: true});
  let localizations = [
    "de.json",
    "en.json",
    "es.json",
    "pl.json",
    "ru.json"
  ]
  let filePath = "systems/blades-in-the-dark/lang/";
  let locTerms = {};
  let allTerms = [];

  for(const filename of localizations){
    let response = await fetch(filePath + filename);
    let terms = await response.json();
    for(const term in terms){
      allTerms[term] = true;
    }
    locTerms[filename] = terms;
  }

  let missing = {};
  for(const language in locTerms){
    missing[language] = {};
    for (const term in allTerms){
      if(!(term in locTerms[language]) && term.startsWith("BITD.")){
        missing[language][term] = "";
      }
    }

  }

  let message = "The following languages are missing some terms:\n";
  for(const [language, terms] of Object.entries(missing)){
    message += `${language}:\n`;
    for(const [term, value] of Object.entries(terms)){
      console.log(term);
      message += `"${term}" : "",\n`;
    }
  }

  console.log(message);


};