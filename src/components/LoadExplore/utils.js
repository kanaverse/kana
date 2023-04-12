import { Code } from "@blueprintjs/core";

export function reportEmbeddings(reduced_dimension_names) {
  if (reduced_dimension_names.length == 0) {
    return "no embeddings";
  }

  return (<>
    {String(reduced_dimension_names.length) + (reduced_dimension_names.length > 1 ? " embeddings " : " embedding ")}
    ( 
      {reduced_dimension_names.map((x, i) => {
        return <>
          {i > 0 ? ", " : "" }
          <Code>{x}</Code>
        </>
    })})
  </>);
}

export function reportFeatureTypes(modality_features) {
  return Object.entries(modality_features).map((x, i) => 
    <>
      {i > 0 ? ", " : "" }
      {x[0] == "" ? (<Code><em>unnamed</em></Code>) : <Code>{x[0]}</Code>}{" "}
      ({x[1].numberOfFeatures} features)
    </>
  );
}

