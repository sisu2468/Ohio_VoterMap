import pin_blue_50 from "./assets/pin_blue_100.png";
import pin_green_50 from "./assets/pin_green_100.png";
import pin_red_50 from "./assets/pin_red_100.png";
import pin_orange_50 from "./assets/pin_orange_100.png";
import "./App.css";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { Card, Checkbox } from "semantic-ui-react";
import turfBboxPolygon from "@turf/bbox-polygon";
import { checkLatLng } from "./utils/helpers.js";

import React, { useRef, useEffect, useState } from "react";

mapboxgl.accessToken =
  "pk.eyJ1IjoiZ292d2hpeiIsImEiOiIxNTM0NGM2MjYwZmFjMWNiNGE3NTY4YTA5MTU4MjIyMiJ9.lPZaEuDk8-CRHWCB0ABdRg";

function App() {
  const debug = false;
  const [filters, setFilters] = useState({
    RMB: true,
    SMB: true,
    VIP: true,
    YTV: true,
  });
  const mapContainer = useRef(null);
  const map = useRef(null);
  const colors = ["#FCC41A", "#339AF0", "#21C930", "#FA5352"];

  useEffect(() => {
    if (map.current) return; // initialize map only once
    const hash = window.location.hash;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/govwhiz/cltru56a5005m01qu1rf0gg65",
      hash: true,
      maxZoom: 17,
      projection: "mercator",
    });
    map.current.fitBounds(
      [
        [-84.82069386553866, 38.40504468653686],
        [-80.52071966199662, 41.97787393972939],
      ],
      { duration: 100 }
    );
    map.current.once("moveend", () => {
      const mapBounds = map.current.getBounds();
      const bboxSquarePolygon = turfBboxPolygon([
        mapBounds.getWest(),
        mapBounds.getSouth(),
        mapBounds.getEast(),
        mapBounds.getNorth(),
      ]);
      map.current.setMaxBounds([
        [bboxSquarePolygon.bbox[0], bboxSquarePolygon.bbox[1]],
        [bboxSquarePolygon.bbox[2], bboxSquarePolygon.bbox[3]],
      ]);
      if (hash?.split("/")?.length >= 3) {
        const parts = hash.split("/");
        const zoom = parseFloat(parts[0].slice(1));
        if (!isNaN(zoom) && zoom >= 0 && zoom <= 17) map.current.setZoom(zoom);
        if (checkLatLng(parts[1], parts[2])) {
          map.current.setCenter([parts[2], parts[1]]);
        }
      }
    });
    map.current.addControl(
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        marker: false,
        bbox: [
          -84.82069386553866, 38.40504468653686, -80.52071966199662,
          41.97787393972939,
        ],
        mapboxgl: mapboxgl,
      }),
      "top-left"
    );

    map.current.on("load", () => {
      // map.current.showTileBoundaries = true;
      loadImage(pin_blue_50, "pin_blue");
      loadImage(pin_red_50, "pin_red");
      loadImage(pin_orange_50, "pin_orange");
      loadImage(pin_green_50, "pin_green");
      loadLayer("govwhiz.6ijh7rm4", "method1_1_1");
      // after the GeoJSON data is loaded, update markers on the screen on every frame
      map.current.on("render", () => {
        if (!map.current.isSourceLoaded("govwhiz.6ijh7rm4")) return;
        updateMarkers();
      });
    });
  });

  useEffect(() => {
    if (!map.current) return; // initialize map only once
    try {
      const enabledFilters = Object.keys(filters).filter((key) => filters[key]);
      const filter = ["in", "Status", ...enabledFilters];
      map.current.setFilter("govwhiz.6ijh7rm4", filter);
    } catch (e) {}
  }, [filters]);

  function onFilterChange(e, v) {
    const newFilters = { ...filters, [v.value]: v.checked };
    setFilters(newFilters);
  }

  function loadImage(img, name) {
    map.current.loadImage(
      img, // Path to your image here
      (error, image) => {
        map.current.addImage(name, image);
      }
    );
  }

  function loadLayer(id, layer) {
    map.current.addSource(id, {
      type: "vector",
      // Use any Mapbox-hosted tileset using its tileset id.
      // Learn more about where to find a tileset id:
      // https://docs.mapbox.com/help/glossary/tileset-id/
      url: `mapbox://${id}`,
      promoteId: { method1_1_1: "SOS_VOTERID" },
    });

    map.current.addLayer({
      id,
      type: "symbol",
      source: id,
      "source-layer": layer,
      filter: ["!", ["has", "point_count"]],
      minzoom: 16,
      layout: {
        // These icons are a part of the Mapbox Light style.
        // To view all images available in a Mapbox style, open
        // the style in Mapbox Studio and click the "Images" tab.
        // To add a new image to the style at runtime see
        // https://docs.mapbox.com/mapbox-gl-js/example/add-image/
        "icon-image": [
          "match",
          ["get", "Status"],
          "RMB",
          "pin_green",
          "SMB",
          "pin_blue",
          "VIP",
          "pin_orange",
          "YTV",
          "pin_red",
          "",
        ],
        "icon-size": 0.35,
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
      },
    });

    map.current.addLayer({
      id: `${id}_cluster`,
      source: id,
      type: "circle",
      "source-layer": layer,
      filter: ["has", "point_count"],
      maxZoom: 15,
      paint: {
        // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
        // with three steps to implement three types of circles:
        "circle-opacity": 0,
        "circle-radius": 0,
      },
    });

    // When a click event occurs on a feature in the places layer, open a popup at the
    // location of the feature, with description HTML from its properties.
    map.current.on("click", id, (e) => {
      // Copy coordinates array.
      const coordinates = e.features[0].geometry.coordinates.slice();
      const firstName = e.features[0].properties.FIRST_NAME;
      const lastName = e.features[0].properties.LAST_NAME;
      const sosVoterID = e.features[0].properties.SOS_VOTERID;
      const status = e.features[0].properties.Status;

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(
          `<table style="width:100%; text-align: left;">
            <tr>
              <th>First Name:</th>
              <td>${firstName}</td>
            </tr>
            <tr>
              <th>Last Name:</th>
              <td>${lastName}</td>
            </tr>
            <tr>
              <th>SOS Voter ID:</th>
              <td>${sosVoterID}</td>
            </tr>
            <tr>
              <th>Status:</th>
              <td>${status}</td>
            </tr>
          </table>`
        )
        .addTo(map.current);
    });

    // Change the cursor to a pointer when the mouse is over the places layer.
    map.current.on("mouseenter", id, () => {
      map.current.getCanvas().style.cursor = "pointer";
    });

    // Change it back to a pointer when it leaves.
    map.current.on("mouseleave", id, () => {
      map.current.getCanvas().style.cursor = "";
    });
  }

  function onClusterClick(feature) {
    const center: LngLatLike = feature.geometry.coordinates;
    map.current.easeTo({
      center: center,
      zoom: map.current.getZoom() + 2,
    });
  }

  // objects for caching and keeping track of HTML marker objects (for performance)
  const markers = {};
  let markersOnScreen = {};

  function updateMarkers() {
    const newMarkers = {};

    let features = map.current.queryRenderedFeatures({
      layers: ["govwhiz.6ijh7rm4_cluster"],
    });
    let ids = features.map((o) => o.id);

    features = features.filter(({ id }, index) => !ids.includes(id, index + 1));
    // for every cluster on the screen, create an HTML marker for it (if we didn't yet),
    // and add it to the map if it's not there already
    for (const feature of features) {
      const coords = feature.geometry.coordinates;
      const props = feature.properties;

      if (!props.clustered) {
        continue;
      }
      const id = props.SOS_VOTERID;

      let marker = markers[id];
      const isMarkerInvalidated =
        marker && marker.feature.properties.point_count !== props.point_count;
      if (!marker || isMarkerInvalidated) {
        if (isMarkerInvalidated) {
          marker.remove();
          delete markersOnScreen[id];
        }
        const el = createDonutChart(props);
        marker = markers[id] = new mapboxgl.Marker({
          element: el,
        }).setLngLat(coords);
        marker.feature = feature;
        marker.getElement().addEventListener("click", (e) => {
          onClusterClick(marker.feature);
        });
      }
      newMarkers[id] = marker;

      if (!markersOnScreen[id]) marker.addTo(map.current);
    }
    // for every marker we've added previously, remove those that are no longer visible
    for (const id in markersOnScreen) {
      if (!newMarkers[id]) markersOnScreen[id].remove();
    }
    markersOnScreen = newMarkers;
  }

  // code for creating an SVG donut chart from feature properties
  function createDonutChart(props) {
    const offsets = [];
    // Split the input string into an array of values
    const statusArray = props.Status.split(",");

    // Initialize counters for each type of value
    const statusCount = {
      YTV: 0,
      RMB: 0,
      SMB: 0,
      VIP: 0,
    };

    // Count the occurrences of each value
    statusArray.forEach((value) => {
      const trimmedValue = value.trim();
      if (statusCount.hasOwnProperty(trimmedValue)) {
        statusCount[trimmedValue]++;
      }
    });

    const counts = [
      statusCount.VIP,
      statusCount.SMB,
      statusCount.RMB,
      statusCount.YTV,
    ];
    let total = 0;
    for (const count of counts) {
      offsets.push(total);
      total += count;
    }
    const fontSize =
      total >= 1000 ? 22 : total >= 100 ? 20 : total >= 10 ? 18 : 16;
    const r = total >= 1000 ? 40 : total >= 100 ? 32 : total >= 10 ? 24 : 18;
    const r0 = Math.round(r * 0.6);
    const w = r * 2;

    let html = `<div>
        <svg width="${w}" height="${w}" viewbox="0 0 ${w} ${w}" text-anchor="middle" style="font: ${fontSize}px sans-serif; display: block">`;

    for (let i = 0; i < counts.length; i++) {
      html += donutSegment(
        offsets[i] / total,
        (offsets[i] + counts[i]) / total,
        r,
        r0,
        colors[i]
      );
    }
    html += `<circle cx="${r}" cy="${r}" r="${r0}" fill="white" />
        <text dominant-baseline="central" transform="translate(${r}, ${r})">
            ${props.point_count_abbreviated.toLocaleString()}
        </text>
        </svg>
        </div>`;

    const el = document.createElement("div");
    el.innerHTML = html;
    return el.firstChild;
  }

  function donutSegment(start, end, r, r0, color) {
    if (end - start === 1) end -= 0.00001;
    const a0 = 2 * Math.PI * (start - 0.25);
    const a1 = 2 * Math.PI * (end - 0.25);
    const x0 = Math.cos(a0),
      y0 = Math.sin(a0);
    const x1 = Math.cos(a1),
      y1 = Math.sin(a1);
    const largeArc = end - start > 0.5 ? 1 : 0;

    // draw an SVG path
    return `<path d="M ${r + r0 * x0} ${r + r0 * y0} L ${r + r * x0} ${
      r + r * y0
    } A ${r} ${r} 0 ${largeArc} 1 ${r + r * x1} ${r + r * y1} L ${
      r + r0 * x1
    } ${r + r0 * y1} A ${r0} ${r0} 0 ${largeArc} 0 ${r + r0 * x0} ${
      r + r0 * y0
    }" fill="${color}" />`;
  }

  return (
    <div className="App">
      <div ref={mapContainer} className="map-container" />
      <div className="filters">
        <Card>
          <div className="filters-title">Layers</div>
          <Checkbox
            className="filter-check"
            label="Yet to Vote"
            value="YTV"
            onChange={onFilterChange}
            defaultChecked
          />
          <Checkbox
            className="filter-check"
            label="Request Ballot by Mail"
            onChange={onFilterChange}
            value="RMB"
            defaultChecked
          />
          <Checkbox
            className="filter-check"
            label="Voted by Mail"
            value="SMB"
            onChange={onFilterChange}
            defaultChecked
          />
          <Checkbox
            className="filter-check"
            label="Voted Early in Person"
            value="VIP"
            onChange={onFilterChange}
            defaultChecked
          />
        </Card>
      </div>
    </div>
  );
}

export default App;
