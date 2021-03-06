import FormData from "form-data";
import { Logger } from './api-hepler-logger';
import config from '../config/config';
import { Options } from "./Options";
import { RequestError } from "./RequestError";

export class RestApiHelper {

	static _config = {};

	static configure(config) {
		RestApiHelper._config = config;
		Logger.setOption(config.logger);
		Logger.log('ApiHelper/CONFIGURATION', {config});
	}

	static setHeaders(headers, request) {
		RestApiHelper._config.request[request].headers = {
			...RestApiHelper._config.request[request].headers,
			...headers
		};
	}

	static setBody(body, request) {
		if (body instanceof FormData) {
			RestApiHelper._config.request[request].body = body;
		}
		else {
			RestApiHelper._config.request[request].body = {
				...RestApiHelper._config.request[request].body,
				...body
			};
		}
	}

	static setIdParam(id, request) {
		let url = RestApiHelper._config.request[request].url;
		if (url.search('{id}') !== -1) {
			RestApiHelper._config.request[request].url = url.replace('{id}', `${id}`);
		}
		else {
			throw new Error(`param 'id' does not declared in ${url}`);
		}
	}

	static async fetch(request) {
		let requestBody = {};
		let requestHeaders = {};
		const options = new Options(RestApiHelper._config.request[request], RestApiHelper._config.baseURL);

		try {
			Logger.log('ApiHelper/RUN: ', {
				'url': options.getUrl(),
				...options.getOptions()
			});

			const response = await fetch(options.getUrl(), options.getOptions());

			Logger.log('ApiHelper/COMPLETE:', {'response': response}, 'blue');

			if (response.headers) {
				if (response.headers.map) {
					requestHeaders = response.headers.map;
				}
				else {
					requestHeaders = response.headers;
				}
			}

			try {
				requestBody = await response.json();

				Logger.log('ApiHelper/PARSE:', {'status': response.status, 'body': requestBody, 'headers': requestHeaders}, 'green');
			}
			catch (error) {
				// that's okay. If status 400, for example, response.json() crashes, but that's okay :) Do nothing
			}
			return RestApiHelper._decorate({status: response.status, body: requestBody, headers: requestHeaders});
		}
		catch (error) {
			throw error;
		}
	}

	static _decorate(response) {
		if (RestApiHelper._isSuccess(response.status)) {
			return {'body': response.body, 'headers': response.headers};
		}
		else {
			Logger.log(`ApiHelper/ERROR:`, {
				'status': `${response.status} ${RestApiHelper._config.statusDescription[response.status] || config.status[response.status]}`
			}, 'red');

			throw new RequestError(
				`${response.status}`,
				`${RestApiHelper._config.statusDescription[response.status] || config.status[response.status]}`,
				JSON.stringify(response.body)
			);
		}
	}

	static _isSuccess(status) {
		return RestApiHelper._config.successStatus.indexOf(status) !== -1;
	}
}
