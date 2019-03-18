var apexDashboardChart = (function () {
    "use strict";
    var scriptVersion = "1.0.3";
    var util = {
        version: "1.0.5",
        isAPEX: function () {
            if (typeof (apex) != 'undefined') {
                return true;
            } else {
                return false;
            }
        },
        debug: {
            info: function (str) {
                if (util.isAPEX()) {
                    apex.debug.info(str);
                }
            },
            error: function (str) {
                if (util.isAPEX()) {
                    apex.debug.error(str);
                } else {
                    console.error(str);
                }
            }
        },
        groupObjectArray: function (objectArr, jSONKey) {
            if (objectArr && Array.isArray(objectArr)) {
                return objectArr.reduce(function (retVal, x) {
                    if (x[jSONKey]) {
                        (retVal[x[jSONKey]] = retVal[x[jSONKey]] || []).push(x);
                    }
                    return retVal;
                }, {});
            } else {
                return [];
            }
        },
        link: function (link) {
            return window.location = link;
        },
        escapeHTML: function (str) {
            if (str === null) {
                return null;
            }
            if (typeof str === "undefined") {
                return;
            }
            if (typeof str === "object") {
                try {
                    str = JSON.stringify(str);
                } catch (e) {
                    /*do nothing */
                }
            }
            if (util.isAPEX()) {
                return apex.util.escapeHTML(String(str));
            } else {
                str = String(str);
                return str
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#x27;")
                    .replace(/\//g, "&#x2F;");
            }
        },
        loader: {
            start: function (id) {
                if (util.isAPEX()) {
                    apex.util.showSpinner($(id));
                } else {
                    /* define loader */
                    var faLoader = $("<span></span>");
                    faLoader.attr("id", "loader" + id);
                    faLoader.addClass("ct-loader");

                    /* define refresh icon with animation */
                    var faRefresh = $("<i></i>");
                    faRefresh.addClass("fa fa-refresh fa-2x fa-anim-spin");
                    faRefresh.css("background", "rgba(121,121,121,0.6)");
                    faRefresh.css("border-radius", "100%");
                    faRefresh.css("padding", "15px");
                    faRefresh.css("color", "white");

                    /* append loader */
                    faLoader.append(faRefresh);
                    $(id).append(faLoader);
                }
            },
            stop: function (id) {
                $(id + " > .u-Processing").remove();
                $(id + " > .ct-loader").remove();
            }
        },
        jsonSaveExtend: function (srcConfig, targetConfig) {
            var finalConfig = {};
            /* try to parse config json when string or just set */
            if (typeof targetConfig === 'string') {
                try {
                    targetConfig = JSON.parse(targetConfig);
                } catch (e) {
                    util.debug.error("Error while try to parse targetConfig. Please check your Config JSON. Standard Config will be used.");
                    util.debug.error(e);
                    util.debug.error(targetConfig);
                }
            } else {
                finalConfig = targetConfig;
            }
            /* try to merge with standard if any attribute is missing */
            try {
                finalConfig = $.extend(true, srcConfig, targetConfig);
            } catch (e) {
                util.debug.error('Error while try to merge 2 JSONs into standard JSON if any attribute is missing. Please check your Config JSON. Standard Config will be used.');
                util.debug.error(e);
                finalConfig = srcConfig;
                util.debug.error(finalConfig);
            }
            return finalConfig;
        },
        noDataMessage: {
            show: function (id, text) {
                var div = $("<div></div>")
                    .css("margin", "12px")
                    .css("text-align", "center")
                    .css("padding", "64px 0")
                    .addClass("nodatafoundmessage");

                var subDiv = $("<div></div>");

                var subDivSpan = $("<span></span>")
                    .addClass("fa")
                    .addClass("fa-search")
                    .addClass("fa-2x")
                    .css("height", "32px")
                    .css("width", "32px")
                    .css("color", "#D0D0D0")
                    .css("margin-bottom", "16px");

                subDiv.append(subDivSpan);

                var span = $("<span></span>")
                    .text(text)
                    .css("display", "block")
                    .css("color", "#707070")
                    .css("font-size", "12px");

                div
                    .append(subDiv)
                    .append(span);

                $(id).append(div);
            },
            hide: function (id) {
                $(id).children('.nodatafoundmessage').remove();
            }
        },
        cutString: function (text, textLength) {
            try {
                if (textLength < 0) return text;
                else {
                    return (text.length > textLength) ?
                        text.substring(0, textLength - 3) + "..." :
                        text
                }
            } catch (e) {
                return text;
            }
        }
    };
    return {
        initialize: function (pRegionID, pAjaxID, pNoDataMsg, pDefaultConfigJSON, pItems2Submit, pRequireHTMLEscape, pData) {

            var stdConfigJSON = {
                "colSpan": 12,
                "dataRowBased": true,
                "grid": {
                    "x": true,
                    "y": true
                },
                "height": {
                    "chart": 400,
                    "xAxis": 10
                },
                "legend": {
                    "position": "right",
                    "show": true
                },
                "padding": {
                    "bottom": 40,
                    "left": 40,
                    "right": 120,
                    "top": 10
                },
                "refresh": 0,
                "rotateAxis": false,
                "showDataLabels": false,
                "showDataPoints": true,
                "tick": {
                    "cutAfter": 30,
                    "maxNumber": 40,
                    "multiline": false,
                    "rotation": 45,
                    "timeFormat": "%m-%d %H:%M"
                },
                "tooltip": {
                    "grouped": true,
                    "show": true
                },
                "transitionDuration": 100,
                "x": {
                    "label": "X Axis",
                    "timeFormat": "%Y-%m-%d %H:%M:%S",
                    "type": "category"
                },
                "y": {
                    "label": "Y Axis 1",
                    "max": null,
                    "min": null
                },
                "y2": {
                    "label": "Y Axis 2",
                    "max": null,
                    "min": null
                },
                "zoom": {
                    "enabled": true,
                    "type": "scroll"
                }
            };

            /* get parent */
            var parentID = "#" + pRegionID;
            var parent = $(parentID).find(".d3dc-root");
            util.debug.info("Load...");
            if (parentID) {
                if (parent.length > 0) {
                    var configJSON = {};
                    configJSON = util.jsonSaveExtend(stdConfigJSON, pDefaultConfigJSON);

                    /* define container and add it to parent */
                    var container = drawContainer(parent);

                    /* get data and draw */
                    getData();

                    /* try to bind APEX refreh event if "APEX" exists */
                    try {
                        $(parentID).bind("apexrefresh", function () {
                            if ($(parentID).is(':visible')) {
                                getData();
                            }
                        });
                    } catch (e) {
                        util.debug.error("Can't bind refresh event on " + parentID + ". Apex is missing");
                        util.debug.error(e);
                    }

                    /* Used to set a refresh via json configuration */
                    if (configJSON.refresh > 0) {
                        setInterval(function () {
                            if ($(parentID).is(':visible')) {
                                getData();
                            }
                        }, configJSON.refresh * 1000);
                    }
                } else {
                    util.debug.error("Can't find element with class d3dc-root in element with id: " + pRegionID);
                }
            } else {
                util.debug.error("Can't find pRegionID: " + pRegionID);
            }
            /***********************************************************************
             **
             ** Used to draw a container
             **
             ***********************************************************************/
            function drawContainer(pParent) {
                var div = $("<div></div>");
                div.addClass("d3dc-container");
                div.attr("id", pRegionID + "-c");
                div.css("min-height", "100px");
                pParent.append(div);
                return (div);
            }

            /************************************************************************
             **
             ** Used to prepare Data from ajax
             **
             ***********************************************************************/
            function prepareData(pDataJSON) {
                var chartIDCol = "CHART_ID";
                util.debug.info(pDataJSON);
                util.debug.info("Ajax finished");
                /* empty container for new stuff */
                container.empty();
                /* draw charts and add it to the container */
                if (pDataJSON.row && pDataJSON.row.length > 0 && pDataJSON.row[0].SERIES) {
                    try {
                        /* group by Chart id */
                        var seriesData = util.groupObjectArray(pDataJSON.row[0].SERIES, chartIDCol);

                        if (pDataJSON.row[0].DATA) {
                            var valuesData = util.groupObjectArray(pDataJSON.row[0].DATA, chartIDCol);
                        }
                        if (pDataJSON.row[0].CONFIG) {
                            var configData = util.groupObjectArray(pDataJSON.row[0].CONFIG, chartIDCol);
                        }

                        /* loop through charts */
                        var chartIDArr = Object.keys(seriesData);
                        util.debug.info("Prepare data - end");
                        drawChartCols(chartIDArr, configData, seriesData, valuesData, configJSON);
                    } catch (e) {
                        util.noDataMessage.show(container, "Error occured!");
                        util.debug.error("Error while try to prepare data");
                        util.debug.error(e);
                    }
                } else {
                    container.css("min-height", "");
                    util.noDataMessage.show(container, pNoDataMsg);
                }
                util.loader.stop(parentID);
                util.debug.info("Finished");
            }

            /***********************************************************************
             **
             ** Used to draw a row
             **
             ***********************************************************************/
            function drawRow(pParent) {
                var div = $("<div></div>");
                div.addClass("d3dc-row");
                pParent.append(div);
                return (div);
            }

            /***********************************************************************
             **
             ** Used to draw chart columns
             **
             ***********************************************************************/
            function drawChartCols(pChartIDs, pConfigData, pSeriesData, pValuesData, pChartConfig) {
                util.debug.info("Prepare data - start");
                /* draw cards */
                /* define row and add it to the container */
                var row = drawRow(container);
                var chartNum = 0;

                if (pChartIDs && pChartIDs.length > 0) {
                    $.each(pChartIDs, function (idx, chartID) {
                        if (pConfigData && pConfigData[chartID] && pConfigData[chartID][0]) {
                            var configJSON = pConfigData[chartID][0];
                        } else {
                            var configJSON = {};
                        }

                        chartNum = chartNum + (configJSON.COLSPAN || pChartConfig.colSpan);
                        /* draw each chart in a col */
                        util.debug.info("Render chart  - Col " + idx);
                        drawChartCol(idx, row, configJSON, pSeriesData[chartID], pValuesData[chartID], pChartConfig);

                        if (chartNum >= 12) {
                            row = drawRow(container);
                            chartNum = 0;
                        }
                    });
                } else {
                    util.noDataMessage.show(container, "No chart ID set or data is column based.");
                    util.debug.info("No chart ID set data is column based. configJSON.dataRowBased: " + pChartConfig.dataRowBased);
                }
            }

            /***********************************************************************
             **
             ** Used to draw one chart column
             **
             ***********************************************************************/
            function drawChartCol(pColIndex, pParent, pConfigData, pSeriesData, pValuesData, pDefaultConfig) {
                var colID = pRegionID + "-c-" + pColIndex;

                /* define new column for rows */
                var col = $("<div></div>");
                col.attr("id", colID);
                col.addClass("d3dc-col-" + (pConfigData.COLSPAN || pDefaultConfig.colSpan));
                col.addClass("d3chartcol");
                pParent.append(col);

                drawSVG(pColIndex, colID, pConfigData, pSeriesData, pValuesData, pDefaultConfig);

                if (pConfigData.TITLE && pConfigData.TITLE.length > 0) {
                    var title = $("<h4></h4>");
                    title.css("text-align", "center");
                    if (pRequireHTMLEscape !== false) {
                        title.text(pConfigData.TITLE);
                    } else {
                        title.html(pConfigData.TITLE);
                    }

                    col.prepend(title);
                }
            }


            /***********************************************************************
             **
             ** function to render chart
             **
             ***********************************************************************/
            function drawSVG(pColIdx, pColID, pConfigData, pSeriesData, pValuesData, pChartConfig) {

                /* set parameter from data or from config */
                function setChartParameter(srcValue, cfgValue, convData2Bool) {
                    if (convData2Bool) {
                        if (srcValue) {
                            if (srcValue == 1) {
                                return true;
                            } else {
                                return false;
                            }
                        } else {
                            return cfgValue;
                        }
                    } else {
                        return (srcValue || cfgValue || "");
                    }
                }

                /* search link from data and set window.location.href */
                function executeLink(seriesID) {
                    $.each(pSeriesData, function (idx, series) {
                        if (seriesID == series.SERIES_ID) {
                            if (series.LINK) {
                                util.link(series.LINK);
                                return true;
                            }
                        }
                    });
                }

                try {
                    util.debug.info("Render chart - Col " + pColIdx + " - check data");

                    var bindTo = "#" + pColID;

                    var datarowbased = pChartConfig.dataRowBased;

                    /* Grid */
                    var grid_x = setChartParameter(pConfigData.GRID_X, pChartConfig.grid.x, true);
                    var grid_y = setChartParameter(pConfigData.GRID_Y, pChartConfig.grid.y, true);

                    /* heights */
                    var height_chart = setChartParameter(pConfigData.HEIGHT_CHART, pChartConfig.height.chart);
                    var height_xaxis = setChartParameter(pConfigData.HEIGHT_XAXIS, pChartConfig.height.xAxis);

                    /* Legend */
                    var legend_show = setChartParameter(pConfigData.LEGEND_SHOW, pChartConfig.legend.show, true);
                    var legend_position = setChartParameter(pConfigData.LEGEND_POSITION, pChartConfig.legend.position);

                    /* padding */
                    var chartPadding = pChartConfig.padding;

                    if (pConfigData.PADDING_BOTTOM) {
                        chartPadding.bottom = pConfigData.PADDING_BOTTOM;
                    }

                    if (pConfigData.PADDING_LEFT) {
                        chartPadding.left = pConfigData.PADDING_LEFT;
                    }

                    if (pConfigData.PADDING_RIGHT) {
                        chartPadding.right = pConfigData.PADDING_RIGHT;
                    }

                    if (pConfigData.PADDING_TOP) {
                        chartPadding.top = pConfigData.PADDING_TOP;
                    }

                    /* Axis */
                    var rotateAxis = setChartParameter(pConfigData.ROTATEAXIS, pChartConfig.rotateAxis, true);

                    /* Labels and Datapoints */
                    var showdatalabels = setChartParameter(pConfigData.SHOWDATALABELS, pChartConfig.showDataLabels, true);
                    var showdatapoints = setChartParameter(pConfigData.SHOWDATAPOINTS, pChartConfig.showDataPoints, true);

                    /* ticks */
                    var tick_cutafter = setChartParameter(pConfigData.TICK_CUTAFTER, pChartConfig.tick.cutAfter);
                    var tick_maxnumber = setChartParameter(pConfigData.TICK_MAXNUMBER, pChartConfig.tick.maxNumber);
                    var tick_rotation = pChartConfig.tick.rotation;
                    var tick_multiline = pChartConfig.tick.multiline;
                    var tick_timeformat = null;

                    /* tooltip */
                    var tooltip_show = setChartParameter(pConfigData.TOOLTIP_SHOW, pChartConfig.tooltip.show, true);
                    var tooltip_grouped = setChartParameter(pConfigData.TOOLTIP_GROUPED, pChartConfig.tooltip.grouped, true);

                    /* Transition duration */
                    var transitionDuration = pChartConfig.transitionDuration;

                    /* x Axis */
                    var x_label = setChartParameter(pConfigData.X_LABEL, pChartConfig.x.label);
                    var x_type = setChartParameter(pConfigData.X_TYPE, pChartConfig.x.type);
                    var xAxisTimeFormat = null;
                    var xName = null;

                    if (x_type == "category" || x_type == "timeseries") {
                        xName = "x";
                    }

                    if (x_type == "timeseries") {
                        xAxisTimeFormat = pChartConfig.x.timeFormat;
                        tick_timeformat = pChartConfig.tick.timeFormat;
                    }

                    /* cut string if category names are to long */
                    if (x_type == "category") {
                        tick_timeformat = function (index, categoryName) {
                            return util.cutString(categoryName, tick_cutafter);
                        };
                    }

                    /* y Axis */
                    var y_label = setChartParameter(pConfigData.Y_LABEL, pChartConfig.y.label);
                    var y_min = setChartParameter(pConfigData.Y_MIN, pChartConfig.y.min);
                    var y_max = setChartParameter(pConfigData.Y_MAX, pChartConfig.y.max);

                    /* y2 Axis */
                    var y2_show = false;
                    var y2_label = setChartParameter(pConfigData.Y2_LABEL, pChartConfig.y2.label);
                    var y2_min = setChartParameter(pConfigData.Y2_MIN, pChartConfig.y2.min);
                    var y2_max = setChartParameter(pConfigData.Y2_MAX, pChartConfig.y2.max);

                    /* Zoom and Subchart */
                    var zoom_enabled = setChartParameter(pConfigData.ZOOM_ENABLED, pChartConfig.zoom.enabled, true);
                    var zoom_type = pChartConfig.zoom.type;
                    var showSubChart = false;

                    if (zoom_enabled) {
                        if (zoom_type == "scroll") {
                            showSubChart = false;
                        } else if (zoom_type == "subchart") {
                            showSubChart = true;
                            zoom_enabled = false;
                        } else if (zoom_type == "drag") {
                            zoom_enabled = {
                                type: "drag"
                            };
                            showSubChart = false;
                        }
                    } else {
                        showSubChart = false;
                    }

                    /* Prepare Data for Render */
                    var dataArr = [];
                    var categoriesArr = [];
                    var groupsArr = [];
                    var colorsJSON = {};
                    var typesJSON = {};
                    var axesJSON = {};
                    var namesJSON = {};
                    var groupJSON = {};
                    var groupsArr = [];

                    if (pSeriesData) {
                        /* Add Categories or time values to X Axis when correct type is set */
                        if (x_type == "category" || x_type == "timeseries") {
                            categoriesArr.push("x");
                            var xCatObj = util.groupObjectArray(pValuesData, "X");
                            var xCatArr = Object.keys(xCatObj);
                            if (datarowbased) {
                                $.each(xCatArr, function (dIdx, dataValues) {
                                    categoriesArr.push((dataValues || null));
                                });
                            } else {
                                $.each(pValuesData, function (dIdx, dataValues) {
                                    categoriesArr.push((dataValues["X"] || null));
                                });
                            }
                        }

                        dataArr.push(categoriesArr);

                        /* Transform data for billboard.js */
                        $.each(pSeriesData, function (idx, series) {
                            if (series.SERIES_ID) {
                                var dataKey = series.SERIES_ID;
                                colorsJSON[dataKey] = series.COLOR;
                                typesJSON[dataKey] = series.TYPE;

                                axesJSON[dataKey] = (series.Y_AXIS || "y");
                                if (series.GROUP_ID) {
                                    if (groupJSON[series.GROUP_ID]) {
                                        groupJSON[series.GROUP_ID].push(dataKey);
                                    } else {
                                        groupJSON[series.GROUP_ID] = [];
                                        groupJSON[series.GROUP_ID].push(dataKey);
                                    }
                                }

                                if (series.Y_AXIS == "y2") {
                                    y2_show = true;
                                }
                                namesJSON[dataKey] = (series.LABEL || dataKey);

                                var arr = [];
                                arr.push(dataKey);
                                if (datarowbased && (x_type == "category" || x_type == "timeseries")) {
                                    $.each(xCatObj, function (dIdx, dataValues) {
                                        var setValue = null;
                                        $.each(dataValues, function (sIDX, sDataValues) {
                                            if (sDataValues.SERIES_ID == dataKey) {
                                                setValue = sDataValues.Y;
                                            }
                                        });
                                        arr.push(setValue);
                                    });
                                } else if (datarowbased) {
                                    $.each(util.groupObjectArray(pValuesData, "SERIES_ID")[dataKey], function (dIdx, dataValues) {
                                        arr.push((dataValues.Y || null));
                                    });
                                } else {
                                    $.each(pValuesData, function (dIdx, dataValues) {
                                        arr.push((dataValues[dataKey] || null));
                                    });
                                }

                                dataArr.push(arr);

                            } else {
                                util.debug.error("NO SERIES_ID found in SERIES_ID Cursor");
                            }

                        });

                        /* Group JSON to Array */
                        $.each(groupJSON, function (dIdx, jsonObj) {
                            groupsArr.push(jsonObj);
                        });

                        try {
                            util.debug.info("Render chart - Col " + pColIdx + " - svg start");

                            var chart = bb.generate({
                                bindto: bindTo,
                                size: {
                                    height: height_chart
                                },
                                data: {
                                    x: xName,
                                    xFormat: xAxisTimeFormat,
                                    columns: dataArr,
                                    types: typesJSON,
                                    groups: groupsArr,
                                    colors: colorsJSON,
                                    labels: showdatalabels,
                                    axes: axesJSON,
                                    names: namesJSON,
                                    onclick: function (d) {
                                        executeLink(d.id);
                                    }
                                },
                                subchart: {
                                    show: showSubChart
                                },
                                zoom: {
                                    enabled: zoom_enabled
                                },
                                transition: {
                                    duration: transitionDuration
                                },
                                legend: {
                                    show: legend_show,
                                    position: legend_position
                                },
                                tooltip: {
                                    show: tooltip_show,
                                    grouped: tooltip_grouped
                                },
                                grid: {
                                    x: {
                                        show: grid_x,
                                    },
                                    y: {
                                        show: grid_y
                                    }
                                },
                                point: {
                                    show: showdatapoints
                                },
                                axis: {
                                    rotated: rotateAxis,
                                    x: {
                                        label: x_label,
                                        type: x_type,
                                        tick: {
                                            culling: {
                                                max: tick_maxnumber
                                            },
                                            rotate: tick_rotation,
                                            multiline: tick_multiline,
                                            format: tick_timeformat
                                        },
                                        height: height_xaxis
                                    },
                                    y: {
                                        label: y_label,
                                        max: y_max,
                                        min: y_min
                                    },
                                    y2: {
                                        show: y2_show,
                                        label: y2_label,
                                        max: y2_max,
                                        min: y2_min
                                    }
                                },
                                padding: chartPadding

                            });

                            util.debug.info("Render chart - Col " + pColIdx + " - svg finished");

                            var chartCont = $(bindTo);

                            /* execute resize */
                            function resize() {
                                if (chartCont.is(':visible')) {
                                    chart.resize({
                                        height: height_chart
                                    });
                                }
                            }

                            if (util.isAPEX()) {
                                $(window).on('apexwindowresized', function () {
                                    resize();
                                });

                                /* bind resize events */
                                $("#t_TreeNav").on('theme42layoutchanged', function () {
                                    resize();
                                });

                                /* dirty workaround because in apex sometimes chart renders in wrong size hope apexDev Team will bring us layout change events also for tabs, collapsible so on */

                                setInterval(function () {
                                    if (chartCont.is(':visible') && (chartCont.width() != chartCont.find("svg").width())) {
                                        resize();
                                    }
                                }, 350);

                                /*$("#t_Button_rightControlButton").on("click", function () {
                                    resize();
                                });  

                                $(".t-Tabs-link").on("click", function () {
                                    resize();
                                });

                                $(".apex-rds-item > a").on("click", function () {
                                    resize(); 
                                });

                                $(".t-Region-headerItems > .t-Button--hideShow").on("click", function () {
                                    resize();
                                });*/
                            }

                        } catch (e) {
                            util.noDataMessage.show(container, "Error occured!");
                            util.debug.error("Error while try to render chart");
                            util.debug.error(e);
                        }

                    } else {
                        util.noDataMessage.show(container, "No series found in data.");
                    }

                } catch (e) {
                    util.noDataMessage.show(container, "Error occured!");
                    util.debug.error("Error while prepare data for chart");
                    util.debug.error(e);
                }
            }

            /***********************************************************************
             **
             ** function to get data from APEX
             **
             ***********************************************************************/
            function getData() {
                if (util.isAPEX()) {
                    util.loader.start(parentID);
                    var submitItems = pItems2Submit;

                    apex.server.plugin(
                        pAjaxID, {
                            pageItems: submitItems
                        }, {
                            success: prepareData,
                            error: function (d) {
                                $(parentID).empty();
                                util.noDataMessage.show(parentID, "Loading Data Error!");
                                util.loader.stop(parentID);
                                util.debug.error(d.responseText);
                            },
                            dataType: "json"
                        });

                } else if (pData) {
                    prepareData(pData);
                } else {
                    util.debug.error("No offline Data found or apex and ajax id is unedefined.")
                }
            }
        }
    }
})();
