import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch, Route } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Pane,
  GeoJSON,
  ZoomControl,
  Marker,
  Popup,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { useTranslation } from 'react-i18next';
import getMapConfig from '../config/map-config';
import { fetchAirtableData } from "../reducers/data";
import SearchBar from './SearchBar';
import HouseIcon from "./HouseIcon";

function LeafletMap({ mapConfig }) {
  const { layers, searchPopup } = useSelector(state => state.data);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const interviews = useSelector((state) => state.data.interviews);

  useEffect(() => {
    dispatch(fetchAirtableData);
  }, [])

  // Make sure layers have resolved before rendering map
  if (!layers || !layers.length || layers.some(layer => layer === undefined))
    return <></>;

  return (
    <>
      <Switch>
        <Route path="/maps/oral-histories">
          {interviews.map((interview) => {
            return (
              <Marker
                key={interview.id}
                position={[
                  interview.fields["Latitude"],
                  interview.fields["Longitude"],
                ]}
                icon={HouseIcon}
                eventHandlers={{
                  click: (e) => {
                    dispatch({
                      type: "ui:interview:selected",
                      payload: interview,
                    });
                  },
                }}
              ></Marker>
            );
          })}
        </Route>
        <Route path="/maps/covid-19">
          <LayersControl collapsed={false} position="topright">
            {layers.map(layer => {
              return (
                <LayersControl.Overlay
                  key={layer.key}
                  name={t(layer.layerConfig.nameI18n)}
                  checked={mapConfig[layer.key] === true}
                >
                  {layer.layerConfig.name === 'Housing Justice Actions' ? (
                    <Pane
                      name={layer.key}
                      style={{ zIndex: 200 + layer.layerConfig.zIndex * 2 }}
                    >
                      <MarkerClusterGroup>
                        <GeoJSON
                          data={layer.data}
                          style={layer.layerConfig.style}
                          pointToLayer={layer.layerConfig.pointToLayer}
                          onEachFeature={(feature, mapLayer) => {
                            mapLayer.on('click', () => {
                              dispatch({
                                type: 'ui:info-window:show',
                                payload: layer.layerConfig.props(mapLayer.feature),
                              });
                            });
                          }}
                        ></GeoJSON>
                      </MarkerClusterGroup>
                    </Pane>
                  ) : (
                    <Pane
                      name={layer.key}
                      style={{ zIndex: 200 + layer.layerConfig.zIndex * 2 }}
                    >
                      <GeoJSON
                        data={layer.data}
                        style={layer.layerConfig.style}
                        onEachFeature={(feature, mapLayer) => {
                          mapLayer.on('click', () => {
                            dispatch({
                              type: 'ui:info-window:show',
                              payload: layer.layerConfig.props(mapLayer.feature),
                            });
                          });
                          layer.layerConfig.onEachFeature(feature, mapLayer);
                        }}
                        pointToLayer={layer.layerConfig.pointToLayer}
                      ></GeoJSON>
                    </Pane>
                  )}
                </LayersControl.Overlay>
              );
            })}
          </LayersControl>
        </Route>
      </Switch>
      <ZoomControl position="bottomright" />
      <Switch>
        <Route path="/covid-19">
          <SearchBar />
        </Route>
      </Switch>
      {/* Popup for search results */}
      {searchPopup && (
        <Popup position={searchPopup.coords}>{searchPopup.content}</Popup>
      )}
    </>
  );
}

export default () => {
  const mapConfig = getMapConfig();

  // Map component id prop may be an anti-pattern
  return (
    <MapContainer
      zoomControl={false}
      center={[mapConfig.lat, mapConfig.lng]}
      maxBounds={mapConfig.bounds}
      minZoom={3}
      tap={false} // https://github.com/domoritz/leaflet-locatecontrol/issues/280
      zoom={mapConfig.z}
      id="map"
    >
      {/* <MapEvents /> */}
      <TileLayer
        attribution="<a href='https://www.antievictionmap.com/' target='_blank'>Anti-Eviction Mapping Project</a>"
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
      />
      <LeafletMap mapConfig={mapConfig} />
    </MapContainer>
  );
};
