package com.app.test.service;

import com.app.test.beans.dto.request.TripPlanRequest;
import com.app.test.beans.dto.request.TripRequest;
import com.app.test.beans.dto.response.PageResponse;
import com.app.test.beans.dto.response.TripResponse;
import com.app.test.beans.dto.response.base.ResponseModelDto;

public interface TripService {

    ResponseModelDto<PageResponse<TripResponse>> search(String keyword, int page, int size);

    ResponseModelDto<TripResponse> getById(String id);

    ResponseModelDto<TripResponse> create(TripRequest request);

    ResponseModelDto<TripResponse> update(TripRequest request);

    ResponseModelDto<TripResponse> delete(String id);

    ResponseModelDto<TripResponse> addUser(String tripId, String userName);

    ResponseModelDto<TripResponse> requestJoin(String tripId, String userName);

    ResponseModelDto<TripResponse> addPlan(String tripId, TripPlanRequest request);

    ResponseModelDto<TripResponse> updatePlan(String tripId, String planId, TripPlanRequest request);

    ResponseModelDto<TripResponse> deletePlan(String tripId, String planId);
}
