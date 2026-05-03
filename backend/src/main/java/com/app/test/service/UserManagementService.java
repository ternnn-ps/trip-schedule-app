package com.app.test.service;

import com.app.test.beans.dto.request.UserRequest;
import com.app.test.beans.dto.request.UserLocationRequest;
import com.app.test.beans.dto.response.PageResponse;
import com.app.test.beans.dto.response.UserResponse;
import com.app.test.beans.dto.response.base.ResponseModelDto;

import java.util.List;

public interface UserManagementService {

    ResponseModelDto<PageResponse<UserResponse>> search(
            String keyword,
            int page,
            int size,
            List<String> sort
    );

    public ResponseModelDto<UserResponse> create(UserRequest request);

    public ResponseModelDto<UserResponse> update(UserRequest request);

    public ResponseModelDto<UserResponse> updateLocation(UserLocationRequest request);

    public ResponseModelDto<UserResponse> delete(UserRequest request);

}
