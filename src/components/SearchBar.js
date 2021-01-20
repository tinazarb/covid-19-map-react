import React, { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import debounce from 'lodash.debounce';
// import i18next from 'i18next';
import { fetch } from 'whatwg-fetch';


// Ask Tim for API key or make a dev/test
/*const BING_API_KEY = <API KEY>;*/
const BING_API_KEY = ``;

function parseBingResults(data) {
  const parsedData = data.resourceSets[0].resources.map(resource => {
    const { name, bbox, point } = resource;
    return { name, bbox, point };
  });

  return parsedData;
}

function getDataIndex(arr, indexValue) {
  return arr.indexOf(indexValue);
}

function useDebounce(callback, delay) {
  // Memoizing the callback because if it's an arrow function
  // it would be different on each render
  const memoizedCallback = useCallback(callback, []);
  const debouncedFn = useRef(debounce(memoizedCallback, delay));

  useEffect(() => {
    debouncedFn.current = debounce(memoizedCallback, delay);
  }, [memoizedCallback, debouncedFn, delay]);

  return debouncedFn.current;
}

function SearchBar(props) {
  const { searchTerm, searchResults } = useSelector(state => state.ui);
  const dispatch = useDispatch();

  const onChange = term => {
    dispatch({ type: 'ui:search:term:set', payload: term });
  };

  const onSubmit = e => {
    e.preventDefault();
  };

  const onKeyUp = e => {
    // on Enter press
    if (e.keyCode === 13 && searchResults) {
      // default selection
      let { value: selection } = e.target;
      const resultNames = searchResults.map(result => result.name);
      let coords;

      if (resultNames.includes(selection)) {
        coords =
          searchResults[getDataIndex(resultNames, selection)].point.coordinates;
      } else {
        coords = searchResults[0].point.coordinates; //first element coords
      }
      // dispatches from new selection
      dispatch({
        type: 'ui:search:term:set',
        payload: selection,
      });
      dispatch({
        type: 'data:marker',
        payload: {
          coords,
          content: selection,
        },
      });
      dispatch({
        type: 'ui:search:results:set',
        payload: null,
      });
    }
  };

  async function fetchBingSearch(term) {
    const lang = navigator.language ? `&culture = ${navigator.language}` : '';
    const url = `http://dev.virtualearth.net/REST/v1/Locations?q=${encodeURIComponent(
      term.trim()
    )}${lang}&key=${BING_API_KEY}`;
    try {
      if (term) {
        const res = await fetch(url);
        const json = await res.json();

        //parse through the results to get data
        dispatch({
          type: 'ui:search:results:set',
          // payload: json.resourceSets[0].resources[0].value, // data we need is VERY nested
          payload: parseBingResults(json),
        });
        /* TODO: 
        -- parse through returned json to get list to be rendered
        -- build carto queries OR render a popup based on lat/lon and ignore carto 
        */
      } else {
        dispatch({ type: 'ui:search:results:set', payload: null });
      }
    } catch (e) {
      throw new Error(`An error occurred fetching Bing data.: ${e.message}. 
      Check that you have a Bing API key.`);
    }
  }

  const debouncedOnChange = useDebounce(val => fetchBingSearch(val), 200);

  return (
    <form id="search-bar-form" onSubmit={onSubmit}>
      <div id="search-bar-div">
        <input
          onChange={async e => {
            onChange(e.target.value);
            debouncedOnChange(e.target.value);
          }}
          onKeyUp={onKeyUp}
          type="text"
          name="search"
          id="search-bar"
          aria-label="search"
          value={searchTerm}
          list="search-bar-autocomplete"
          autoComplete="off"
          placeholder="Search nation, state, city..."
        />
        <datalist id="search-bar-autocomplete">
          {searchResults &&
            searchResults.map((result, index) => (
              <option key={index} value={result.name} />
            ))}
        </datalist>
      </div>
    </form>
  );
}

export default SearchBar;
